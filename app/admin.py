"""
============================================
app/admin.py — Gestión de tokens .env
============================================

Port del commit 5 (6a89a62). Lee/escribe variables del .env
desde el panel admin, sin reiniciar el servidor.

Campos editables (los que tienen sentido desde la UI):
  - TELEGRAM_BOT_TOKEN      (pool en Fase 3)
  - SHERLOCK_API_KEY
  - SUBFINDER_API_KEY
  - NUCLEI_API_KEY
  - SECRET_KEY              (avanzado, rotar sesión)
  - ENV                     (development | production)

NO se exponen valores completos al frontend (solo enmascarados).
Solo el backend tiene acceso al valor real.

# MODIFICAR: si querés encriptar valores en disco, usá cryptography.Fernet
"""
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.auth import is_authenticated
from app.config import settings

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
ENV_EXAMPLE = BASE_DIR / ".env.example"

# Variables que la UI puede tocar
EDITABLE_KEYS = {
    "TELEGRAM_BOT_TOKEN",
    "SHERLOCK_API_KEY",
    "SUBFINDER_API_KEY",
    "NUCLEI_API_KEY",
    "SECRET_KEY",
    "ENV",
}

# Keys que se enmascaran siempre al devolver al frontend
SENSITIVE_KEYS = {
    "TELEGRAM_BOT_TOKEN",
    "SHERLOCK_API_KEY",
    "SUBFINDER_API_KEY",
    "NUCLEI_API_KEY",
    "SECRET_KEY",
}


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def _read_env_file() -> dict[str, str]:
    """Lee el .env como dict. Si no existe, devuelve vacío."""
    if not ENV_FILE.exists():
        return {}
    out: dict[str, str] = {}
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, value = line.partition("=")
        out[key.strip()] = value.strip()
    return out


def _sanitize_value(value: str) -> str:
    """Elimina saltos de linea y caracteres peligrosos que rompen el .env."""
    return value.replace("\n", "").replace("\r", "").replace("\x00", "")


def _write_env_file(values: dict[str, str]) -> None:
    """
    Reescribe el .env preservando comentarios y orden cuando es posible.
    Estrategia simple: leer .env.example como plantilla, pisar valores conocidos.
    """
    # Sanitizar todos los valores
    values = {k: _sanitize_value(v) for k, v in values.items()}

    if ENV_EXAMPLE.exists():
        lines = ENV_EXAMPLE.read_text(encoding="utf-8").splitlines()
    else:
        lines = [f"{k}={v}" for k, v in values.items()]

    new_lines: list[str] = []
    seen: set[str] = set()
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            new_lines.append(line)
            continue
        if "=" not in stripped:
            new_lines.append(line)
            continue
        key = stripped.partition("=")[0].strip()
        if key in values:
            new_lines.append(f"{key}={values[key]}")
            seen.add(key)
        else:
            new_lines.append(line)

    # Agregar keys nuevas que no estaban en .env.example
    for key, value in values.items():
        if key not in seen:
            new_lines.append(f"{key}={value}")

    # Backup antes de escribir por si algo sale mal
    if ENV_FILE.exists():
        backup = ENV_FILE.with_suffix(".env.bak")
        try:
            backup.write_text(ENV_FILE.read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            pass

    # FIX #7 (escritura atomica): escribir primero a un archivo .tmp en el
    # mismo directorio y despues hacer un os.replace() atomico al nombre final.
    # Asi si el proceso se mata a mitad de escritura, el .env nunca queda
    # corrupto/parcial. Tambien sincronizamos fsync() para que los datos
    # lleguen a disco antes del rename.
    import os
    import tempfile
    tmp_path = ENV_FILE.with_suffix(".env.tmp")
    try:
        with open(tmp_path, "w", encoding="utf-8", newline="") as f:
            f.write("\n".join(new_lines) + "\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_path, ENV_FILE)
    except Exception:
        # Si algo fallo, intentar limpiar el .tmp
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except Exception:
            pass
        raise


def _mask(value: str) -> str:
    """Enmascara un valor dejando 4 caracteres visibles al final."""
    if not value:
        return ""
    if len(value) <= 4:
        return "*" * len(value)
    return "*" * (len(value) - 4) + value[-4:]


def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class TokenItem(BaseModel):
    key: str
    masked_value: str
    is_set: bool
    is_sensitive: bool


class UpdateTokensRequest(BaseModel):
    updates: dict[str, str]   # key -> nuevo valor (vacío = borrar)


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
router = APIRouter()


@router.get("/tokens", response_model=list[TokenItem])
async def list_tokens(request: Request):
    """
    Lista los tokens editables. Devuelve valores enmascarados
    para los sensibles, completos para los no sensibles.
    """
    _require_auth(request)
    current = _read_env_file()

    # Mezclar con .env.example para mostrar keys aunque no estén seteadas
    example = _read_env_file() if not ENV_EXAMPLE.exists() else {
        line.partition("=")[0].strip(): ""
        for line in ENV_EXAMPLE.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#") and "=" in line
    }

    all_keys = EDITABLE_KEYS
    out: list[TokenItem] = []
    for key in sorted(all_keys):
        value = current.get(key) or getattr(settings, key.lower(), None) or ""
        is_sensitive = key in SENSITIVE_KEYS
        out.append(
            TokenItem(
                key=key,
                masked_value=_mask(value) if is_sensitive else value,
                is_set=bool(value),
                is_sensitive=is_sensitive,
            )
        )
    return out


@router.put("/tokens")
async def update_tokens(req: UpdateTokensRequest, request: Request):
    """
    Actualiza uno o varios tokens. Valida keys contra EDITABLE_KEYS.
    Si una key llega con string vacío, se borra del .env.
    """
    _require_auth(request)

    if not req.updates:
        raise HTTPException(status_code=400, detail="No se enviaron cambios")

    # Validar keys
    for key in req.updates:
        if key not in EDITABLE_KEYS:
            raise HTTPException(
                status_code=400,
                detail=f"Key no editable: {key}. Permitidas: {sorted(EDITABLE_KEYS)}",
            )

    # Validar ENV
    if "ENV" in req.updates:
        if req.updates["ENV"] not in ("development", "production"):
            raise HTTPException(
                status_code=400,
                detail="ENV debe ser 'development' o 'production'",
            )

    # Validar SECRET_KEY mínimo
    if "SECRET_KEY" in req.updates and len(req.updates["SECRET_KEY"]) < 16:
        raise HTTPException(
            status_code=400,
            detail="SECRET_KEY debe tener al menos 16 caracteres",
        )

    # Leer .env actual, pisar/eliminar
    current = _read_env_file()
    for key, value in req.updates.items():
        if value == "":
            current.pop(key, None)
        else:
            current[key] = value

    _write_env_file(current)
    return {"ok": True, "updated": list(req.updates.keys())}


@router.post("/tokens/rotate-secret")
async def rotate_secret(request: Request):
    """Genera un nuevo SECRET_KEY aleatorio y lo guarda."""
    _require_auth(request)
    import secrets
    new_secret = secrets.token_urlsafe(48)

    current = _read_env_file()
    current["SECRET_KEY"] = new_secret
    _write_env_file(current)

    return {"ok": True, "message": "SECRET_KEY rotado. Las sesiones activas quedan invalidadas."}


@router.post("/tokens/reload")
async def reload_settings(request: Request):
    """
    Recarga .env sin reiniciar el servidor.
    Como pydantic-settings cachea con lru_cache, esto resetea el cache.
    """
    _require_auth(request)
    from app.config import get_settings
    get_settings.cache_clear()
    return {"ok": True, "message": "Settings recargadas desde .env"}
