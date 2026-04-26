"""
Carga de variables de entorno desde .env (raiz del proyecto).

Uso:
    from bots.shared.env import get_env, require_env

    token = require_env("TELEGRAM_BOT_TOKEN")  # lanza error si falta
    debug = get_env("DEBUG", default="false")  # con default
"""

import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

# === Carga del .env ===
# Busca .env subiendo desde este archivo hasta encontrar la raiz del proyecto.
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_ENV_PATH = _PROJECT_ROOT / ".env"

if _ENV_PATH.exists():
    load_dotenv(_ENV_PATH)


# === API publica ===

def get_env(key: str, default: Optional[str] = None) -> Optional[str]:
    """Devuelve el valor de una variable de entorno, o `default` si no existe."""
    return os.getenv(key, default)


def require_env(key: str) -> str:
    """
    Devuelve el valor de una variable de entorno obligatoria.
    Lanza RuntimeError si no esta configurada.

    # MODIFICAR: si quieres un mensaje de error mas amigable, edita aqui.
    """
    value = os.getenv(key)
    if not value:
        raise RuntimeError(
            f"Falta la variable de entorno '{key}'. "
            f"Configurala en {_ENV_PATH} o desde el panel admin."
        )
    return value


def env_path() -> Path:
    """Devuelve la ruta al archivo .env (util para mensajes de error)."""
    return _ENV_PATH
