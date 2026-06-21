"""
============================================
app/ctf_osint.py — Panel OSINT
============================================

Port del commit A (01cefcf). Lee data/osint_bots.json.
Carga los bots preconfigurados de OSINT (sherlock, holehe, exiftool, etc)
y los expone como endpoints para que la UI /ctf-osint los liste.

# MODIFICAR: persistir cambios del usuario a un override file
"""
import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from app.auth import is_authenticated

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
BOTS_FILE = BASE_DIR / "data" / "osint_bots.json"


def _load_all() -> dict:
    if not BOTS_FILE.exists():
        return {"version": "0.0.0", "description": "", "bots": []}
    return json.loads(BOTS_FILE.read_text(encoding="utf-8"))


def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
router = APIRouter()


@router.get("/")
async def list_osint_bots(
    request: Request,
    category: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """Lista los bots OSINT con filtros opcionales."""
    _require_auth(request)
    data = _load_all()
    bots = data.get("bots", [])

    if category:
        bots = [b for b in bots if b.get("category") == category]
    if tag:
        bots = [b for b in bots if tag in b.get("tags", [])]
    if search:
        s = search.lower()
        bots = [b for b in bots if s in b.get("name", "").lower() or s in b.get("description", "").lower()]

    return {
        "version": data.get("version"),
        "total": len(bots),
        "bots": bots,
    }


@router.get("/categories")
async def list_categories(request: Request):
    """Lista las categorias con conteo."""
    _require_auth(request)
    data = _load_all()
    cats: dict[str, int] = {}
    for b in data.get("bots", []):
        c = b.get("category", "uncategorized")
        cats[c] = cats.get(c, 0) + 1
    return {"categories": [{"id": k, "count": v} for k, v in cats.items()]}


@router.get("/{bot_id}")
async def get_bot(bot_id: str, request: Request):
    """Devuelve un bot especifico."""
    _require_auth(request)
    data = _load_all()
    for b in data.get("bots", []):
        if b.get("id") == bot_id:
            return b
    raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' no existe")


@router.post("/{bot_id}/render")
async def render_command(bot_id: str, request: Request, args: dict[str, str] = {}):
    """Renderiza el comando con los args del usuario (no ejecuta nada)."""
    _require_auth(request)
    data = _load_all()
    bot = None
    for b in data.get("bots", []):
        if b.get("id") == bot_id:
            bot = b
            break
    if not bot:
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' no existe")

    cmd = list(bot.get("command", []))
    for arg in bot.get("args", []):
        placeholder = "{" + arg["name"] + "}"
        for i, part in enumerate(cmd):
            if placeholder in part:
                if arg["name"] not in args:
                    if arg.get("required", False):
                        raise HTTPException(400, f"Falta arg requerido: {arg['name']}")
                else:
                    cmd[i] = part.replace(placeholder, args[arg["name"]])

    return {
        "bot_id": bot_id,
        "command": cmd,
        "command_str": " ".join(cmd),
    }
