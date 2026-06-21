"""
============================================
app/logging_config.py — Logging estructurado con structlog
============================================

Configuracion central de logging. Una sola funcion `configure_logging()`
que se llama desde main.py al arrancar la app.

Decisiones de diseno:
  - structlog como logger estandar (ya usamos JSONL en activity, structlog
    es el equivalente en logs en vivo)
  - Formato dual: JSON en produccion, consola coloreada en dev
  - Compatible con logging estandar de Python (captura warnings, errores
    de librerias externas, etc.)
  - No intrusivo: modulos existentes pueden seguir usando `print()` o el
    `logging` estandar, ambos siguen funcionando.

Uso:
    from app.logging_config import configure_logging, get_logger

    configure_logging(env="production")  # llamada unica en main.py
    logger = get_logger(__name__)
    logger.info("bot_started", bot_id="x", run_id="y")
"""
import logging
import os
import sys

import structlog


def configure_logging(env: str | None = None, level: str | None = None) -> None:
    """
    Configura structlog + logging estandar. Llamar una vez al arranque.

    env: "production" (JSON) o "development" (consola coloreada).
         Si es None, se infiere de la variable de entorno ENV.
    level: "DEBUG", "INFO", "WARNING", "ERROR". Default INFO.
    """
    if env is None:
        env = os.getenv("ENV", "production").lower()
    if level is None:
        level = os.getenv("LOG_LEVEL", "INFO").upper()

    # Configurar logging estandar para que las librerias externas (uvicorn,
    # fastapi, sqlalchemy) emitan a traves de structlog tambien.
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level, logging.INFO),
    )

    # Nivel de las librerias ruidosas
    for noisy in ("uvicorn.access", "uvicorn.error", "asyncio"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    # Cadena de processors compartida
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
    ]

    if env == "development":
        # Humano: colores, llaves resaltadas
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]
    else:
        # Maquina: JSON una linea por evento
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level, logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """
    Devuelve un logger bound al nombre del modulo.
    Uso: from app.logging_config import get_logger; logger = get_logger(__name__)
    """
    return structlog.get_logger(name)
