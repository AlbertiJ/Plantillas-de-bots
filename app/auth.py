"""
============================================
app/auth.py — Login, cambio de clave, reset
============================================

Este módulo es el que tiene el FIX del bug original:
el endpoint de reset debe borrar data/credentials/ COMPLETO
y regenerar, no solo marcar must_change=True sobre el existente.

Flujo:
  1. first-run: _ensure_admin_credentials() crea admin con clave random
  2. POST /api/auth/login → valida + setea cookie de sesión
  3. POST /api/auth/change → si must_change=True, obliga a cambiarla
  4. POST /api/auth/reset → BORRA credentials/, regenera, devuelve clave nueva
  5. POST /api/auth/logout → limpia cookie

# MODIFICAR: sumar 2FA (TOTP) si querés endurecer el panel admin.
"""
import json
import secrets
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Cookie, HTTPException, Request, Response
from passlib.hash import bcrypt
from pydantic import BaseModel

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
CREDENTIALS_DIR = BASE_DIR / "data" / "credentials"

SESSION_COOKIE = "pdb_session"
SESSION_TOKEN_COOKIE = "pdb_session_token"


# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str


class ResetRequest(BaseModel):
    confirm: bool  # el front tiene que pedir confirmación


# ---------------------------------------------------------
# CRUD de credenciales
# ---------------------------------------------------------
def _cred_path(username: str) -> Path:
    return CREDENTIALS_DIR / f"cred-{username}.json"


def create_credential(username: str, password: str, must_change: bool = False) -> dict:
    """Crea o sobreescribe una credencial. Usado en first-run y reset."""
    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
    payload = {
        "username": username,
        "password_hash": bcrypt.hash(password),
        "must_change": must_change,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_modified": datetime.now(timezone.utc).isoformat(),
    }
    _cred_path(username).write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return payload


def get_credential(username: str) -> Optional[dict]:
    path = _cred_path(username)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def update_credential(username: str, **fields) -> dict:
    """Actualiza campos de la credencial (ej. password_hash, must_change)."""
    cred = get_credential(username)
    if not cred:
        raise HTTPException(status_code=404, detail="Credencial no encontrada")
    cred.update(fields)
    cred["last_modified"] = datetime.now(timezone.utc).isoformat()
    _cred_path(username).write_text(json.dumps(cred, indent=2), encoding="utf-8")
    return cred


# ---------------------------------------------------------
# Sesión (cookie simple firmada con SECRET)
# ---------------------------------------------------------
def _make_session_token(username: str) -> str:
    # MODIFICAR: firmar con itsdangerous + SECRET_KEY real
    return f"{username}:{secrets.token_urlsafe(24)}"


def _parse_session_token(token: str) -> Optional[str]:
    if not token or ":" not in token:
        return None
    username, _ = token.split(":", 1)
    return username if username else None


def is_authenticated(request: Request) -> bool:
    token = request.cookies.get(SESSION_TOKEN_COOKIE)
    return _parse_session_token(token) is not None


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
router = APIRouter()


@router.post("/login")
async def login(req: LoginRequest, response: Response):
    cred = get_credential(req.username)
    if not cred or not bcrypt.verify(req.password, cred["password_hash"]):
        raise HTTPException(status_code=401, detail="Usuario o clave incorrectos")

    token = _make_session_token(req.username)
    response.set_cookie(
        key=SESSION_TOKEN_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 8,  # 8 horas
    )
    return {
        "ok": True,
        "must_change": cred.get("must_change", False),
        "username": req.username,
    }


@router.post("/change")
async def change_password(req: ChangePasswordRequest, request: Request):
    username = _parse_session_token(request.cookies.get(SESSION_TOKEN_COOKIE))
    if not username:
        raise HTTPException(status_code=401, detail="No autenticado")

    cred = get_credential(username)
    if not cred or not bcrypt.verify(req.old_password, cred["password_hash"]):
        raise HTTPException(status_code=401, detail="Clave actual incorrecta")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="La clave nueva debe tener al menos 8 caracteres")

    update_credential(
        username,
        password_hash=bcrypt.hash(req.new_password),
        must_change=False,
    )
    return {"ok": True, "must_change": False}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(SESSION_TOKEN_COOKIE)
    return {"ok": True}


# ---------------------------------------------------------
# FIX DEL BUG ORIGINAL
# ---------------------------------------------------------
@router.post("/reset")
async def reset_credentials(req: ResetRequest, request: Request):
    """
    Borra data/credentials/ COMPLETO y regenera la clave admin.

    Bug del original: el endpoint solo flageaba must_change=True
    sin regenerar la clave, así que el usuario nunca podía entrar
    si había olvidado la contraseña. Esta versión:
      1. Borra todo el directorio credentials/
      2. Genera una clave aleatoria nueva
      3. La guarda y la DEVUELVE en la response
      4. La imprime en consola como respaldo

    NOTA: Este endpoint NO requiere auth — es el "boton de panico"
    cuando el admin se quedo afuera. Si lo expones a internet,
    cualquiera puede resetear la clave. Mitigaciones:
      - Bindear a 127.0.0.1 (default en el README)
      - Poner detras de un reverse proxy con auth basica
    """
    if not req.confirm:
        raise HTTPException(
            status_code=400,
            detail="Confirmación requerida. Pasá confirm=true para borrar todo.",
        )

    # 1. Borrar todo el directorio
    if CREDENTIALS_DIR.exists():
        shutil.rmtree(CREDENTIALS_DIR)
    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)

    # 2. Generar clave nueva
    new_password = secrets.token_urlsafe(16)

    # 3. Crear credencial limpia
    create_credential(username="admin", password=new_password, must_change=True)

    # 4. Banner de respaldo en consola (sin emojis para no romper cp1252)
    banner = (
        "\n" + "!" * 60 + "\n"
        "  RESET DE CREDENCIALES EJECUTADO\n"
        + "!" * 60 + "\n"
        f"  Nueva clave admin: {new_password}\n"
        + "!" * 60 + "\n"
    )
    print(banner)

    return {
        "ok": True,
        "username": "admin",
        "new_password": new_password,   # se muestra UNA SOLA VEZ
        "must_change": True,
        "warning": "Guardá esta clave. No se vuelve a mostrar.",
    }
