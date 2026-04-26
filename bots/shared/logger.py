"""
Logger compartido para todas las plantillas de bots.

Uso:
    from bots.shared.logger import get_logger
    logger = get_logger(__name__)
    logger.info("Bot iniciado")

Niveles soportados via variable de entorno LOG_LEVEL:
    DEBUG, INFO (default), WARNING, ERROR, CRITICAL
"""

import logging
import os


_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
_DATEFMT = "%Y-%m-%d %H:%M:%S"

_configured = False


def _configure_root() -> None:
    """Configura el root logger una sola vez."""
    global _configured
    if _configured:
        return

    # MODIFICAR: cambia el nivel default si quieres mas o menos verbosidad.
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    logging.basicConfig(format=_FORMAT, datefmt=_DATEFMT, level=level)

    # Silencia loggers ruidosos de librerias terceras.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)

    _configured = True


def get_logger(name: str) -> logging.Logger:
    """
    Devuelve un logger con formato consistente.

    # MODIFICAR: si quieres logs a archivo, agrega un FileHandler aqui.
    """
    _configure_root()
    return logging.getLogger(name)
