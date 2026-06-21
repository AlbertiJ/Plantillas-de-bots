"""
============================================
app/activity.py — Historial de ejecuciones
============================================

Lee/escribe data/activity.jsonl (formato append-only).
Una linea por evento. Cada linea es un JSON independiente.

Eventos soportados:
  - start:      bot arranco
  - done:       bot termino (con exit_code, duration_s)
  - timeout:    bot tardo demasiado
  - error:      fallo al lanzar (comando no encontrado, etc)
  - sync_done:  ejecucion sync termino

# MODIFICAR: si el historial crece mucho, podes rotarlo a data/activity-YYYY-MM.jsonl
"""
import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request
from pydantic import BaseModel

from app.auth import is_authenticated

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
ACTIVITY_LOG = BASE_DIR / "data" / "activity.jsonl"
ACTIVITY_LOG.parent.mkdir(parents=True, exist_ok=True)

MAX_LINES = 10_000  # cap de seguridad en respuestas

# Q4: configuracion del logrotate automatico
LOGROTATE_MAX_BYTES = 5 * 1024 * 1024   # 5 MB por archivo
LOGROTATE_KEEP_FILES = 5                 # mantener activity.jsonl.1 .. .5
LOGROTATE_CHECK_EVERY = 100              # chequear tamano cada N appends

# FIX #8 (race condition): lock de proceso para serializar los append.
# Antes, dos requests que llamaban a /append o al launcher al mismo
# tiempo podian pisarse y dejar lineas corruptas (mezcla de bytes).
# Usamos RLock (re-entrante) porque _rotate_now() se llama desde dentro
# de _append() que ya tiene el lock — con Lock normal seria deadlock.
_APPEND_LOCK = threading.RLock()

# ---------------------------------------------------------
# Q4: Logrotate automatico
# ---------------------------------------------------------
_ROTATE_COUNTER = 0  # cuenta appends desde la ultima rotacion


def _maybe_rotate() -> None:
    """
    Si el log supera LOGROTATE_MAX_BYTES, lo rota estilo logrotate:
      activity.jsonl     -> activity.jsonl.1
      activity.jsonl.1   -> activity.jsonl.2
      ...
      activity.jsonl.(N-1) -> activity.jsonl.N (se borra el ultimo)
    """
    global _ROTATE_COUNTER
    _ROTATE_COUNTER += 1
    # No chequear en cada append, es overkill
    if _ROTATE_COUNTER % LOGROTATE_CHECK_EVERY != 0:
        return
    if not ACTIVITY_LOG.exists():
        return
    try:
        size = ACTIVITY_LOG.stat().st_size
    except OSError:
        return
    if size < LOGROTATE_MAX_BYTES:
        return
    _rotate_now()


def _rotate_now() -> dict:
    """
    Ejecuta la rotacion de archivos. Devuelve un dict con el resultado
    para que pueda ser testeado y para tener audit log.
    """
    if not ACTIVITY_LOG.exists():
        return {"rotated": False, "reason": "no log file"}
    with _APPEND_LOCK:  # reusar el mismo lock para no competir con appends
        # Borrar el mas viejo si existe
        oldest = ACTIVITY_LOG.with_suffix(".jsonl").parent / f"activity.jsonl.{LOGROTATE_KEEP_FILES}"
        if oldest.exists():
            oldest.unlink()
        # Rotar .N -> .N+1 en cascada
        for i in range(LOGROTATE_KEEP_FILES - 1, 0, -1):
            src = ACTIVITY_LOG.parent / f"activity.jsonl.{i}"
            dst = ACTIVITY_LOG.parent / f"activity.jsonl.{i + 1}"
            if src.exists():
                src.replace(dst)
        # El actual pasa a ser .1
        rotated = ACTIVITY_LOG.with_suffix(".jsonl.1")
        ACTIVITY_LOG.replace(rotated)
    return {
        "rotated": True,
        "ts": datetime.now(timezone.utc).isoformat(),
        "new_file": str(ACTIVITY_LOG),
    }


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


def _read_all(limit: Optional[int] = None) -> list[dict]:
    if not ACTIVITY_LOG.exists():
        return []
    lines = ACTIVITY_LOG.read_text(encoding="utf-8").splitlines()
    items = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            items.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    if limit:
        items = items[-limit:]
    return items


def _append(entry: dict) -> None:
    """Append a JSONL line. Usado por launcher.py internamente."""
    entry.setdefault("ts", datetime.now(timezone.utc).isoformat())
    # FIX #8: serializar los append con un lock de proceso. Antes, dos
    # requests concurrentes podian mezclar bytes y dejar lineas truncadas.
    with _APPEND_LOCK:
        with ACTIVITY_LOG.open("a", encoding="utf-8") as f:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
            f.flush()
        # Q4: logrotate automatico basado en tamano del archivo
        _maybe_rotate()


# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class ClearRequest(BaseModel):
    confirm: bool = False


class AppendRequest(BaseModel):
    bot_id: str
    event: str
    exit_code: Optional[int] = None
    duration_s: Optional[float] = None
    run_id: Optional[str] = None
    extra: dict = {}


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
router = APIRouter()


@router.get("/")
async def list_activity(
    request: Request,
    limit: int = Query(200, le=MAX_LINES, ge=1),
    bot_id: Optional[str] = Query(None, description="Filtrar por bot"),
    event: Optional[str] = Query(None, description="Filtrar por tipo de evento"),
):
    """Lista el historial, opcionalmente filtrado."""
    _require_auth(request)
    items = _read_all(limit=MAX_LINES)  # leemos todo y filtramos en memoria
    if bot_id:
        items = [i for i in items if i.get("bot_id") == bot_id]
    if event:
        items = [i for i in items if i.get("event") == event]
    # aplicar limit DESPUES de filtrar
    items = items[-limit:]
    return {
        "items": items,
        "total": len(items),
        "log_file": str(ACTIVITY_LOG.relative_to(BASE_DIR)),
    }


@router.post("/clear")
async def clear_activity(req: ClearRequest, request: Request):
    """Borra el archivo de historial (con confirmacion)."""
    _require_auth(request)
    if not req.confirm:
        raise HTTPException(status_code=400, detail="Pasá confirm=true para borrar")
    if ACTIVITY_LOG.exists():
        ACTIVITY_LOG.unlink()
    return {"ok": True, "deleted": str(ACTIVITY_LOG.relative_to(BASE_DIR))}


@router.post("/append")
async def append_entry(req: AppendRequest, request: Request):
    """
    Append manual. Usado por launcher.py o integraciones externas.
    Para uso normal no hace falta llamarlo.
    """
    _require_auth(request)
    entry = {
        "bot_id": req.bot_id,
        "event": req.event,
        "run_id": req.run_id,
        "exit_code": req.exit_code,
        "duration_s": req.duration_s,
        **req.extra,
    }
    entry = {k: v for k, v in entry.items() if v is not None}
    _append(entry)
    return {"ok": True, "appended": entry}


@router.get("/stats")
async def stats(request: Request):
    """Estadísticas agregadas: bots únicos, eventos, último run."""
    _require_auth(request)
    items = _read_all(limit=MAX_LINES)
    if not items:
        return {"total": 0, "bots": [], "last_activity": None}

    bots: dict[str, int] = {}
    events: dict[str, int] = {}
    for i in items:
        bid = i.get("bot_id", "?")
        bots[bid] = bots.get(bid, 0) + 1
        ev = i.get("event", "?")
        events[ev] = events.get(ev, 0) + 1

    return {
        "total": len(items),
        "unique_bots": len(bots),
        "events_by_type": events,
        "runs_by_bot": bots,
        "last_activity": items[-1].get("ts"),
        "last_bot": items[-1].get("bot_id"),
    }


@router.post("/rotate")
async def force_rotate(request: Request):
    """
    Q4: Fuerza una rotacion manual del log. Util cuando se quiere
    hacer un corte limpio antes de operaciones (ej: backups).
    """
    _require_auth(request)
    result = _rotate_now()
    return result
