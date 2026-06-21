"""
============================================
app/builder.py — CRUD de bots (Bot Builder)
============================================

Port del commit 1 (6cd96c7). Cada bot es un JSON en data/bots/<id>.json.

Estructura del JSON:
  {
    "id": "mi-bot",
    "name": "Mi bot",
    "token": "123:ABC...",
    "command": ["python", "scripts/mi_bot.py"],
    "cwd": "/ruta/opcional",
    "args": [],
    "autostart": false,
    "watchdog": {"enabled": false, "restart_on_crash": false, "max_restarts": 3},
    "metadata": {"description": "...", "category": "osint", "tags": []},
    "config_visual": {"name": "...", "description": "...", "commands": [...]}
  }

# MODIFICAR: agregar campo "env" para variables de entorno por bot.
"""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.auth import is_authenticated

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
BOTS_DIR = BASE_DIR / "data" / "bots"
BOTS_DIR.mkdir(parents=True, exist_ok=True)

ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")

# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


def _bot_path(bot_id: str) -> Path:
    if not ID_REGEX.match(bot_id):
        raise HTTPException(status_code=400, detail="ID invalido (solo [a-zA-Z0-9_-]{1,64})")
    return BOTS_DIR / f"{bot_id}.json"


def _validate_bot_dict(data: dict) -> None:
    """Validaciones comunes para crear/actualizar un bot."""
    if "id" in data and not ID_REGEX.match(data["id"]):
        raise HTTPException(status_code=400, detail="ID invalido")
    if "command" in data:
        cmd = data["command"]
        if isinstance(cmd, str):
            pass  # se acepta string
        elif isinstance(cmd, list) and all(isinstance(c, str) for c in cmd):
            pass
        else:
            raise HTTPException(status_code=400, detail="command debe ser string o list de strings")
    if "token" in data and data["token"]:
        # El token de Telegram tiene formato "<digits>:<base64-like>"
        if ":" not in data["token"]:
            raise HTTPException(status_code=400, detail="Token de Telegram invalido (debe tener formato 'digits:base64')")


def _mask_token(data: dict) -> dict:
    """Enmascara el token en un dict de bot para devolver al front."""
    out = dict(data)
    if "token" in out and out["token"]:
        t = out["token"]
        out["token"] = ("*" * (len(t) - 4) + t[-4:]) if len(t) > 4 else "****"
    return out


# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class BotCreate(BaseModel):
    id: str = Field(..., pattern=r"^[a-zA-Z0-9_-]{1,64}$")
    name: str
    token: str = ""
    command: list[str] | str
    cwd: Optional[str] = None
    args: list[str] = []
    autostart: bool = False
    metadata: dict = {}
    config_visual: dict = {}


class BotUpdate(BaseModel):
    name: Optional[str] = None
    token: Optional[str] = None
    command: Optional[list[str] | str] = None
    cwd: Optional[str] = None
    args: Optional[list[str]] = None
    autostart: Optional[bool] = None
    metadata: Optional[dict] = None
    config_visual: Optional[dict] = None


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
router = APIRouter()


@router.get("/")
async def list_bots(request: Request):
    """Lista todos los bots (con tokens enmascarados)."""
    _require_auth(request)
    bots = []
    for p in BOTS_DIR.glob("*.json"):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if "id" in data:
            bots.append(_mask_token(data))
    return {"bots": bots, "total": len(bots)}


@router.get("/{bot_id}")
async def get_bot(bot_id: str, request: Request):
    """Devuelve un bot especifico (token enmascarado)."""
    _require_auth(request)
    path = _bot_path(bot_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' no existe")
    return _mask_token(json.loads(path.read_text(encoding="utf-8")))


@router.get("/{bot_id}/raw")
async def get_bot_raw(bot_id: str, request: Request):
    """
    Devuelve el JSON COMPLETO (con token real).
    SOLO para uso interno del launcher.py.
    """
    _require_auth(request)
    path = _bot_path(bot_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' no existe")
    return json.loads(path.read_text(encoding="utf-8"))


@router.post("/")
async def create_bot(bot: BotCreate, request: Request):
    """Crea un bot nuevo."""
    _require_auth(request)
    path = _bot_path(bot.id)
    if path.exists():
        raise HTTPException(status_code=409, detail=f"Bot '{bot.id}' ya existe")

    data = bot.model_dump(exclude_none=True)
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["updated_at"] = data["created_at"]
    _validate_bot_dict(data)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"ok": True, "bot": _mask_token(data)}


@router.put("/{bot_id}")
async def update_bot(bot_id: str, patch: BotUpdate, request: Request):
    """Actualiza campos de un bot existente (merge)."""
    _require_auth(request)
    path = _bot_path(bot_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' no existe")

    data = json.loads(path.read_text(encoding="utf-8"))
    updates = patch.model_dump(exclude_none=True)
    data.update(updates)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    _validate_bot_dict(data)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"ok": True, "bot": _mask_token(data)}


@router.delete("/{bot_id}")
async def delete_bot(bot_id: str, request: Request):
    """Elimina un bot."""
    _require_auth(request)
    path = _bot_path(bot_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' no existe")
    path.unlink()
    return {"ok": True, "deleted": bot_id}


@router.post("/{bot_id}/duplicate")
async def duplicate_bot(bot_id: str, request: Request, new_id: str):
    """Duplica un bot con un ID nuevo."""
    _require_auth(request)
    src = _bot_path(bot_id)
    if not src.exists():
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' no existe")
    dst = _bot_path(new_id)
    if dst.exists():
        raise HTTPException(status_code=409, detail=f"Bot '{new_id}' ya existe")

    data = json.loads(src.read_text(encoding="utf-8"))
    data["id"] = new_id
    data["name"] = data.get("name", bot_id) + " (copia)"
    data["created_at"] = datetime.now(timezone.utc).isoformat()
    data["updated_at"] = data["created_at"]
    dst.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return {"ok": True, "bot": _mask_token(data)}
