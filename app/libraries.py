"""
============================================
app/libraries.py — Gestion de librerias Python para CTF
============================================

Port del commit A (01cefcf). Lee data/libraries.json.
Expone el catalogo de librerias utiles (scapy, paramiko, pwntools, etc)
para que la UI /libraries las liste.

# MODIFICAR: agregar endpoint /install/<lib> que ejecute pip install
              (con confirm y verificacion de que el bot corra en sandbox)
"""
import json
from pathlib import Path
from typing import Any, Optional, cast

from fastapi import APIRouter, HTTPException, Query, Request

from app.auth import is_authenticated

BASE_DIR = Path(__file__).resolve().parent.parent
LIBS_FILE = BASE_DIR / "data" / "libraries.json"


def _load_all() -> dict[str, Any]:
    if not LIBS_FILE.exists():
        return {"version": "0.0.0", "libraries": []}
    return cast(dict[str, Any], json.loads(LIBS_FILE.read_text(encoding="utf-8")))


def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


router = APIRouter()


@router.get("/")
async def list_libraries(
    request: Request,
    search: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
):
    _require_auth(request)
    data = _load_all()
    libs = data.get("libraries", [])

    if search:
        s = search.lower()
        libs = [l for l in libs if s in l.get("name", "").lower() or s in l.get("description", "").lower()]
    if tag:
        libs = [l for l in libs if tag in l.get("tags", [])]

    return {
        "version": data.get("version"),
        "total": len(libs),
        "libraries": libs,
    }


@router.get("/tags")
async def list_tags(request: Request):
    """Lista todos los tags con conteo."""
    _require_auth(request)
    data = _load_all()
    tags: dict[str, int] = {}
    for l in data.get("libraries", []):
        for t in l.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    return {
        "tags": [{"name": k, "count": v} for k, v in sorted(tags.items(), key=lambda x: -x[1])]
    }


@router.get("/{lib_name}")
async def get_library(lib_name: str, request: Request):
    """Devuelve una libreria especifica por nombre."""
    _require_auth(request)
    data = _load_all()
    for l in data.get("libraries", []):
        if l.get("name", "").lower() == lib_name.lower():
            return l
    raise HTTPException(status_code=404, detail=f"Libreria '{lib_name}' no encontrada")
