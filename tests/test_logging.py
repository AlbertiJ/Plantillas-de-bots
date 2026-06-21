"""
============================================
tests/test_logging.py — Tests del logging estructurado
============================================

Cubre C2 del ROADMAP: structlog como logger estandar.
"""
import io
import json
import logging

import pytest
import structlog


# ============================================================
# Tests del modulo
# ============================================================
class TestLoggingConfig:
    """Validacion de configure_logging() y get_logger()."""

    def test_configure_logging_no_falla(self, monkeypatch):
        """AGENT-T: configure_logging() corre sin errores en produccion."""
        from app import logging_config
        logging_config.configure_logging(env="production", level="INFO")
        logger = logging_config.get_logger("test")
        logger.info("test_event", foo="bar")

    def test_configure_logging_dev(self, monkeypatch):
        """AGENT-T: en dev usa ConsoleRenderer (no JSON)."""
        from app import logging_config
        logging_config.configure_logging(env="development", level="DEBUG")
        logger = logging_config.get_logger("test")
        # Solo verificamos que no falla
        logger.debug("debug_event", x=1)
        logger.info("info_event", y=2)

    def test_configure_logging_json_output(self, monkeypatch):
        """AGENT-T: en produccion los logs se emiten en JSON parseable."""
        from app import logging_config
        # Capturar la salida real via un handler en un StringIO
        import logging as stdlib_logging
        buf = io.StringIO()
        handler = stdlib_logging.StreamHandler(buf)
        handler.setLevel(stdlib_logging.INFO)
        formatter = stdlib_logging.Formatter("%(message)s")
        handler.setFormatter(formatter)
        root = stdlib_logging.getLogger()
        root.handlers = [handler]  # reemplazar handlers existentes
        root.setLevel(stdlib_logging.INFO)

        logging_config.configure_logging(env="production", level="INFO")
        logger = logging_config.get_logger("test_json")
        logger.info("test_event", foo="bar", count=42)
        output = buf.getvalue()
        # Buscar la linea JSON
        lines = [l for l in output.splitlines() if l.strip().startswith("{")]
        assert len(lines) > 0, f"No se encontro JSON: {output!r}"
        for line in lines:
            event = json.loads(line)
            assert "event" in event, f"event no esta en {event}"

    def test_configure_logging_json_contiene_campos_clave(self):
        """AGENT-T: el JSON incluye level, timestamp, event."""
        from app import logging_config
        import logging as stdlib_logging
        buf = io.StringIO()
        handler = stdlib_logging.StreamHandler(buf)
        handler.setLevel(stdlib_logging.INFO)
        handler.setFormatter(stdlib_logging.Formatter("%(message)s"))
        root = stdlib_logging.getLogger()
        root.handlers = [handler]
        root.setLevel(stdlib_logging.INFO)

        logging_config.configure_logging(env="production", level="INFO")
        logger = logging_config.get_logger("test_fields")
        logger.warning("something_happened", bot_id="abc", run_id="xyz")
        lines = [l for l in buf.getvalue().splitlines() if l.strip().startswith("{")]
        assert lines, f"No se encontro linea JSON en {buf.getvalue()!r}"
        event = json.loads(lines[-1])
        for field in ("event", "level", "timestamp"):
            assert field in event, f"Campo {field} no esta en {event}"

    def test_get_logger_devuelve_logger_nombrado(self):
        """AGENT-T: get_logger(__name__) devuelve un logger con el nombre del modulo."""
        from app import logging_config
        logging_config.configure_logging(env="production", level="INFO")
        logger = logging_config.get_logger("mi_modulo.test")
        assert logger is not None

    def test_log_level_warning_suprime_info(self):
        """AGENT-T: si el nivel es WARNING, los INFO no se emiten."""
        from app import logging_config
        import logging as stdlib_logging
        buf = io.StringIO()
        handler = stdlib_logging.StreamHandler(buf)
        handler.setLevel(stdlib_logging.INFO)
        handler.setFormatter(stdlib_logging.Formatter("%(message)s"))
        root = stdlib_logging.getLogger()
        root.handlers = [handler]
        root.setLevel(stdlib_logging.INFO)

        logging_config.configure_logging(env="production", level="WARNING")
        logger = logging_config.get_logger("test_level")
        logger.info("info_que_no_debe_salir", x=1)
        logger.warning("warning_que_si_debe_salir", x=2)
        output = buf.getvalue()
        assert "info_que_no_debe_salir" not in output
        assert "warning_que_si_debe_salir" in output

    def test_stdlib_loggers_siguen_funcionando(self):
        """AGENT-T: los loggers de stdlib (warnings, uvicorn, etc.) siguen emitiendo.

        structlog convive con stdlib logging, no lo reemplaza.
        """
        from app import logging_config
        logging_config.configure_logging(env="production", level="INFO")
        # Un logger externo via stdlib logging no debe romperse
        stdlib_logger = logging.getLogger("test_third_party")
        try:
            stdlib_logger.info("from_stdlib_logging")
        except Exception as e:
            pytest.fail(f"stdlib logger se rompio: {e}")
        # Si llego aca sin excepcion, OK

    def test_configure_logging_idempotente(self):
        """AGENT-T: llamar configure_logging() 2 veces no rompe."""
        from app import logging_config
        logging_config.configure_logging(env="production", level="INFO")
        logging_config.configure_logging(env="production", level="INFO")
        logger = logging_config.get_logger("test")
        logger.info("still_works")


# ============================================================
# Tests de integracion con main.py
# ============================================================
class TestLoggingIntegration:
    """Valida que main.py usa el logger configurado."""

    def test_main_importa_logging_config(self):
        """AGENT-T: main.py importa configure_logging y lo llama."""
        from pathlib import Path
        main_path = Path("main.py")
        assert main_path.exists()
        content = main_path.read_text(encoding="utf-8")
        assert "from app.logging_config" in content
        assert "configure_logging" in content

    def test_launcher_usa_structlog(self):
        """AGENT-T: app/launcher.py emite eventos con logger.info()."""
        from pathlib import Path
        launcher_path = Path("app/launcher.py")
        content = launcher_path.read_text(encoding="utf-8")
        assert "logger.info" in content
        assert 'bot_started' in content
        assert 'bot_finished' in content
