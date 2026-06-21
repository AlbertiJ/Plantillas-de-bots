"""
============================================
app/botfather.py — Integración con BotFather
============================================

BotFather es el bot oficial de Telegram para crear y configurar bots.
NO expone una API REST publica. Lo que si tenemos:

  - La API de Bots de Telegram (api.telegram.org/bot<TOKEN>/...)
    que nos permite aplicar CAMBIOS en nuestros bots usando
    el mismo TOKEN que nos dio BotFather al crearlos.

  - Las cosas que BotFather hace por vos (cambiar nombre, descripcion,
    comandos, foto) las podemos replicar con la API de Bots:

      setMyName              -> nombre visible
      setMyDescription       -> descripcion completa (hasta 512 chars)
      setMyShortDescription  -> descripcion corta (hasta 120 chars)
      setMyCommands          -> lista de comandos (/start, /help, etc)
      setChatPhoto           -> foto del bot
      deleteChatPhoto        -> borrar la foto
      getMyDescription       -> ver la descripcion actual
      getMyName              -> ver el nombre actual
      getMyCommands          -> ver los comandos actuales

  - Lo que tu bot HACE (responde mensajes, ejecuta logica) es TU CODIGO
    y NO se toca. Eso es el script que esta corriendo en data/bots/.

  - Lo que BotFather hace y nosotros replicamos es solo la CONFIGURACION
    visible: nombre, descripcion, comandos, foto.

  - Las cosas que SOLO BotFather puede hacer (y nosotros no):
      - Crear un bot nuevo (/newbot)
      - Obtener el token (nos lo da BotFather una vez)
      - Revocar/regenerar el token (/revoke)
      - Transferir ownership
    Para esas, seguis hablando con BotFather en Telegram.

# MODIFICAR: agregar soporte para webhook si se quiere
              dejar de usar polling en el bot.
"""
import ipaddress
import json
import socket
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.auth import is_authenticated

# ---------------------------------------------------------
# Constantes
# ---------------------------------------------------------
TELEGRAM_API = "https://api.telegram.org/bot{token}/{method}"
ALLOWED_NAME_OPS = {"name", "description", "short_description", "commands", "photo"}
ALLOWED_COMMANDS_MAX = 100  # limite de Telegram
ALLOWED_DESC_MAX = 512
ALLOWED_SHORT_DESC_MAX = 120

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
BOT_PROFILES_DIR = BASE_DIR / "data" / "bots"
BOT_PROFILES_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


def _list_local_bots() -> list[dict]:
    """Lista los JSONs de bots que tenes en data/bots/."""
    out = []
    for p in BOT_PROFILES_DIR.glob("*.json"):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if "token" in data and "id" in data:
            out.append(data)
    return out


async def _tg_call(token: str, method: str, **params) -> dict:
    """Llama a la API de Telegram y devuelve el JSON o levanta 502."""
    url = TELEGRAM_API.format(token=token, method=method)
    # Telegram solo acepta params via POST en estos endpoints
    files = {}
    data = {}
    for k, v in params.items():
        if isinstance(v, (bytes, bytearray)):
            files[k] = v
        elif hasattr(v, "read"):
            files[k] = v
        else:
            data[k] = v

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            if files:
                r = await client.post(url, data=data, files=files)
            else:
                r = await client.post(url, json=data)
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"No se pudo conectar con Telegram: {e}")

    body = r.json()
    if not body.get("ok"):
        raise HTTPException(
            status_code=400,
            detail=f"Telegram respondio error: {body.get('description', body)}",
        )
    return body.get("result", body)


# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class ChangeNameRequest(BaseModel):
    bot_id: str
    language_code: str = ""   # vacio = default
    name: str                 # max 64 chars


class ChangeDescriptionRequest(BaseModel):
    bot_id: str
    language_code: str = ""
    description: str = ""     # vacio = borrar


class ChangeCommandsRequest(BaseModel):
    bot_id: str
    commands: list[dict]      # [{"command": "start", "description": "..."}]
    language_code: str = ""


class ChangePhotoRequest(BaseModel):
    bot_id: str
    photo_url: str            # URL publica de la nueva foto


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
router = APIRouter()


# ==================== LISTADO ====================
@router.get("/bots")
async def list_my_bots(request: Request):
    """Lista los bots locales (los que tenes en data/bots/)."""
    _require_auth(request)
    bots = _list_local_bots()
    # No exponer el token completo, solo el final
    safe = []
    for b in bots:
        item = {**b}
        if "token" in item:
            t = item["token"]
            item["token"] = ("*" * (len(t) - 4) + t[-4:]) if len(t) > 4 else "****"
        safe.append(item)
    return {"bots": safe, "total": len(safe)}


@router.get("/bots/{bot_id}/current")
async def get_current_config(bot_id: str, request: Request):
    """
    Trae la configuracion ACTUAL del bot en Telegram
    (lo que BotFather/Api de bots tiene registrado ahora).
    """
    _require_auth(request)
    bots = _list_local_bots()
    bot = next((b for b in bots if b.get("id") == bot_id), None)
    if not bot:
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' no encontrado")

    token = bot["token"]
    out = {"bot_id": bot_id, "name": None, "description": None,
           "short_description": None, "commands": None}

    # Pedimos los datos en paralelo-ish
    import asyncio
    for field, method in [
        ("name", "getMyName"),
        ("description", "getMyDescription"),
        ("short_description", "getMyShortDescription"),
        ("commands", "getMyCommands"),
    ]:
        try:
            res = await _tg_call(token, method)
            out[field] = res.get(field)
        except HTTPException as e:
            out[field] = {"error": e.detail}

    return out


# ==================== APLICAR CAMBIOS ====================
@router.post("/bots/change-name")
async def change_name(req: ChangeNameRequest, request: Request):
    """Cambia el nombre visible del bot (lo que hace /setname en BotFather)."""
    _require_auth(request)
    if not (1 <= len(req.name) <= 64):
        raise HTTPException(400, "El nombre debe tener entre 1 y 64 caracteres")

    bots = _list_local_bots()
    bot = next((b for b in bots if b.get("id") == req.bot_id), None)
    if not bot:
        raise HTTPException(404, f"Bot '{req.bot_id}' no encontrado")

    params = {"name": req.name}
    if req.language_code:
        params["language_code"] = req.language_code

    res = await _tg_call(bot["token"], "setMyName", **params)
    return {"ok": True, "applied": "name", "new_value": req.name, "telegram": res}


@router.post("/bots/change-description")
async def change_description(req: ChangeDescriptionRequest, request: Request):
    """Cambia la descripcion completa (lo que hace /setdescription)."""
    _require_auth(request)
    if len(req.description) > ALLOWED_DESC_MAX:
        raise HTTPException(400, f"Descripcion max {ALLOWED_DESC_MAX} chars")

    bots = _list_local_bots()
    bot = next((b for b in bots if b.get("id") == req.bot_id), None)
    if not bot:
        raise HTTPException(404, f"Bot '{req.bot_id}' no encontrado")

    params = {"description": req.description}
    if req.language_code:
        params["language_code"] = req.language_code

    res = await _tg_call(bot["token"], "setMyDescription", **params)
    return {"ok": True, "applied": "description", "telegram": res}


@router.post("/bots/change-short-description")
async def change_short_description(req: ChangeDescriptionRequest, request: Request):
    """Cambia la descripcion corta (lo que hace /setabouttext en BotFather)."""
    _require_auth(request)
    if len(req.description) > ALLOWED_SHORT_DESC_MAX:
        raise HTTPException(400, f"Short descripcion max {ALLOWED_SHORT_DESC_MAX} chars")

    bots = _list_local_bots()
    bot = next((b for b in bots if b.get("id") == req.bot_id), None)
    if not bot:
        raise HTTPException(404, f"Bot '{req.bot_id}' no encontrado")

    params = {"short_description": req.description}
    if req.language_code:
        params["language_code"] = req.language_code

    res = await _tg_call(bot["token"], "setMyShortDescription", **params)
    return {"ok": True, "applied": "short_description", "telegram": res}


@router.post("/bots/change-commands")
async def change_commands(req: ChangeCommandsRequest, request: Request):
    """
    Cambia la lista de comandos (lo que hace /setcommands en BotFather).
    commands: [{"command": "start", "description": "Inicia el bot"}, ...]
    Si pasas lista vacia, se borran todos.
    """
    _require_auth(request)
    if len(req.commands) > ALLOWED_COMMANDS_MAX:
        raise HTTPException(400, f"Maximo {ALLOWED_COMMANDS_MAX} comandos")

    for c in req.commands:
        if "command" not in c or "description" not in c:
            raise HTTPException(400, "Cada comando necesita 'command' y 'description'")
        if not (1 <= len(c["command"]) <= 32):
            raise HTTPException(400, f"Comando '{c['command']}' fuera de rango (1-32)")
        if not (1 <= len(c["description"]) <= 256):
            raise HTTPException(400, f"Descripcion del comando fuera de rango (1-256)")

    bots = _list_local_bots()
    bot = next((b for b in bots if b.get("id") == req.bot_id), None)
    if not bot:
        raise HTTPException(404, f"Bot '{req.bot_id}' no encontrado")

    params = {"commands": json.dumps(req.commands)}
    if req.language_code:
        params["language_code"] = req.language_code

    res = await _tg_call(bot["token"], "setMyCommands", **params)
    return {"ok": True, "applied": "commands", "count": len(req.commands), "telegram": res}


@router.post("/bots/change-photo")
async def change_photo(req: ChangePhotoRequest, request: Request):
    """Cambia la foto del bot desde una URL publica."""
    _require_auth(request)
    bots = _list_local_bots()
    bot = next((b for b in bots if b.get("id") == req.bot_id), None)
    if not bot:
        raise HTTPException(404, f"Bot '{req.bot_id}' no encontrado")

    # Descargamos la foto y la subimos como multipart
    try:
        # FIX #4 (SSRF): validar que la URL sea HTTPS y no apunte a una
        # red privada / loopback / link-local antes de descargar.
        # Esto evita que un atacante use este endpoint como proxy para
        # escanear puertos internos o leer el metadata 169.254.169.254.
        parsed = urlparse(req.photo_url)
        if parsed.scheme != "https":
            raise HTTPException(
                400,
                "photo_url debe usar HTTPS",
            )
        if not parsed.hostname:
            raise HTTPException(400, "photo_url sin host")
        # Resolver todos los IPs del host y bloquear rangos sensibles.
        try:
            infos = socket.getaddrinfo(parsed.hostname, None)
        except socket.gaierror as e:
            raise HTTPException(400, f"photo_url no resuelve: {e}")
        for info in infos:
            ip_str = info[4][0]
            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                continue
            if (
                ip.is_private
                or ip.is_loopback
                or ip.is_link_local
                or ip.is_multicast
                or ip.is_reserved
                or ip.is_unspecified
            ):
                raise HTTPException(
                    400,
                    f"photo_url apunta a una IP bloqueada ({ip})",
                )
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.get(req.photo_url)
            r.raise_for_status()
            photo_bytes = r.content
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"No se pudo descargar la foto: {e}")

    res = await _tg_call(
        bot["token"], "setChatPhoto",
        chat_id=bot.get("chat_id", bot["id"]),  # para bots, chat_id = bot id
        photo=photo_bytes,
    )
    return {"ok": True, "applied": "photo", "size_bytes": len(photo_bytes), "telegram": res}


@router.post("/bots/delete-photo")
async def delete_photo(bot_id: str, request: Request):
    """Borra la foto del bot."""
    _require_auth(request)
    bots = _list_local_bots()
    bot = next((b for b in bots if b.get("id") == bot_id), None)
    if not bot:
        raise HTTPException(404, f"Bot '{bot_id}' no encontrado")

    res = await _tg_call(
        bot["token"], "deleteChatPhoto",
        chat_id=bot.get("chat_id", bot["id"]),
    )
    return {"ok": True, "applied": "delete_photo", "telegram": res}


# ==================== PLANTILLA / TEMPLATE ====================
@router.get("/template")
async def get_template(request: Request):
    """
    Devuelve una plantilla para crear bots nuevos que sean compatibles
    con este sistema. Lo que vive en data/bots/<id>.json:
    """
    _require_auth(request)
    template = {
        "id": "mi-bot-ejemplo",
        "name": "Mi bot de ejemplo",
        "token": "123456:ABC-DEF...",   # el que te dio BotFather
        "script": "scripts/mi_bot.py",  # ruta al script que hace la logica
        "command": ["python", "scripts/mi_bot.py"],
        "cwd": None,
        "args": [],
        "autostart": False,
        "watchdog": {
            "enabled": False,
            "restart_on_crash": False,
            "max_restarts": 3,
            "check_interval_s": 30
        },
        "metadata": {
            "description": "Lo que hace mi bot (esto lo configura el USUARIO, no BotFather)",
            "category": "osint",
            "tags": ["ejemplo"]
        },
        "config_visual": {
            "name": "Mi bot de ejemplo",
            "description": "Descripcion completa (hasta 512 chars)",
            "short_description": "Descripcion corta (hasta 120)",
            "commands": [
                {"command": "start", "description": "Inicia el bot"},
                {"command": "help",  "description": "Muestra ayuda"}
            ],
            "photo_url": None
        }
    }
    return {
        "template": template,
        "notes": [
            "El 'token' te lo dio BotFather cuando creaste el bot con /newbot",
            "Lo que esta en 'metadata' es la logica de tu bot (lo que el SCRIPT hace)",
            "Lo que esta en 'config_visual' es lo que vas a poder cambiar desde este panel",
            "  (equivalente a usar /setname, /setdescription, /setcommands, /setuserpic en BotFather)",
            "Los cambios en config_visual se aplican con la API de Bots de Telegram",
            "Los cambios en metadata o en el script son TUYOS, no se tocan desde aca"
        ]
    }


@router.post("/bots/{bot_id}/apply-config-visual")
async def apply_visual_config(bot_id: str, request: Request):
    """
    Aplica TODO el bloque config_visual de un bot (nombre + descripciones +
    comandos + foto) a su cuenta de Telegram, en una sola llamada.
    """
    _require_auth(request)
    bots = _list_local_bots()
    bot = next((b for b in bots if b.get("id") == bot_id), None)
    if not bot:
        raise HTTPException(404, f"Bot '{bot_id}' no encontrado")

    visual = bot.get("config_visual", {})
    applied = []

    if "name" in visual and visual["name"]:
        await _tg_call(bot["token"], "setMyName", name=visual["name"])
        applied.append("name")

    if "description" in visual:
        await _tg_call(bot["token"], "setMyDescription", description=visual["description"])
        applied.append("description")

    if "short_description" in visual:
        await _tg_call(bot["token"], "setMyShortDescription", short_description=visual["short_description"])
        applied.append("short_description")

    if "commands" in visual:
        await _tg_call(
            bot["token"], "setMyCommands",
            commands=json.dumps(visual["commands"]),
        )
        applied.append("commands")

    return {"ok": True, "applied": applied, "bot_id": bot_id}
