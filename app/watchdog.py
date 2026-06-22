"""
============================================
app/watchdog.py — Watchdog de bots
============================================

Port del commit B (233b2e8). Monitorea bots con watchdog.enabled=True
y los reinicia automaticamente si mueren.

Arquitectura:
  - WatchdogManager singleton (en memoria)
  - asyncio.create_task por bot con watchdog.enabled
  - Polling cada check_interval_s (default 10s)
  - Si el proceso muere, restart_on_crash=True -> relanza
  - Cap de max_restarts para no loop infinito

# MODIFICAR: persistir estado de watchdogs a data/watchdog_state.json
              para que sobrevivan reinicios del server
"""
import asyncio
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, cast

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.auth import is_authenticated

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
BOTS_DIR = (BASE_DIR / "data" / "bots").resolve()

# FIX #1 (seguridad): regex para validar bot_id - previene path traversal
BOT_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{1,64}$")


def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


# ---------------------------------------------------------
# Manager (singleton en memoria)
# ---------------------------------------------------------
class WatchedProcess:
    """Representa un bot supervisado."""

    def __init__(self, bot_id: str, bot_config: dict):
        self.bot_id = bot_id
        self.config = bot_config
        self.proc: Optional[subprocess.Popen] = None
        self.started_at: Optional[float] = None
        self.restarts = 0
        self.alive = False
        self.last_error: Optional[str] = None
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    def to_dict(self) -> dict:
        return {
            "bot_id": self.bot_id,
            "alive": self.alive,
            "pid": self.proc.pid if self.proc else None,
            "started_at": datetime.fromtimestamp(self.started_at, timezone.utc).isoformat() if self.started_at else None,
            "uptime_s": round(time.time() - self.started_at, 1) if self.started_at and self.alive else 0,
            "restarts": self.restarts,
            "last_error": self.last_error,
            "watchdog_enabled": self.config.get("watchdog", {}).get("enabled", False),
            "restart_on_crash": self.config.get("watchdog", {}).get("restart_on_crash", False),
        }

    async def _monitor_loop(self):
        """Loop de supervision."""
        check_interval = self.config.get("watchdog", {}).get("check_interval_s", 10)
        max_restarts = self.config.get("watchdog", {}).get("max_restarts", 3)
        restart_on_crash = self.config.get("watchdog", {}).get("restart_on_crash", False)

        while not self._stop_event.is_set():
            await asyncio.sleep(check_interval)
            if self._stop_event.is_set():
                break

            if self.proc and self.proc.poll() is not None:
                # El proceso termino
                self.alive = False
                if restart_on_crash and self.restarts < max_restarts:
                    self.restarts += 1
                    self.last_error = f"Proceso termino con exit={self.proc.returncode}, reiniciando ({self.restarts}/{max_restarts})"
                    self._start_proc()
                else:
                    self.last_error = f"Proceso termino con exit={self.proc.returncode}"
                    if not restart_on_crash:
                        break

    def _start_proc(self):
        cmd = self.config.get("command", [])
        if isinstance(cmd, str):
            cmd = [cmd]
        cwd = self.config.get("cwd")
        if cwd:
            cwd = str(Path(cwd).resolve())

        try:
            if sys.platform == "win32":
                # CREATE_NEW_PROCESS_GROUP: el hijo queda en su propio grupo
                # para que taskkill /T pueda matarlo junto con sus nietos.
                # CREATE_NO_WINDOW: no aparece ventana de consola.
                self.proc = subprocess.Popen(
                    cmd, cwd=cwd,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP,
                )
            else:
                # start_new_session: similar a CREATE_NEW_PROCESS_GROUP en Linux
                self.proc = subprocess.Popen(
                    cmd, cwd=cwd,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    start_new_session=True,
                )
            self.started_at = time.time()
            self.alive = True
        except Exception as e:
            self.last_error = str(e)
            self.alive = False

    def start(self):
        if self._task and not self._task.done():
            return
        self._start_proc()
        self._stop_event.clear()
        self._task = asyncio.create_task(self._monitor_loop())

    def stop(self, force: bool = False, timeout: float = 3.0):
        """Detiene el watchdog y mata el proceso. En Windows mata el arbol entero
        (taskkill /T /F) porque terminate() no alcanza para ping.exe y procesos hijos."""
        self._stop_event.set()
        if self.proc and self.proc.poll() is None:
            try:
                if sys.platform == "win32":
                    # taskkill /T = mata el proceso Y todos sus hijos
                    # /F = forzado (no da tiempo a cleanup)
                    import subprocess as _sp
                    _sp.run(
                        ["taskkill", "/T", "/F", "/PID", str(self.proc.pid)],
                        capture_output=True, timeout=5,
                    )
                else:
                    self.proc.terminate()
                    try:
                        self.proc.wait(timeout=timeout)
                    except subprocess.TimeoutExpired:
                        self.proc.kill()
                        self.proc.wait(timeout=timeout)
            except Exception as e:
                self.last_error = f"stop error: {e}"
        if self._task:
            self._task.cancel()
            try:
                self._task.result()  # limpia la excepcion
            except (asyncio.CancelledError, Exception):
                pass
        self.alive = False


_MANAGER: dict[str, WatchedProcess] = {}


def _load_bot_config(bot_id: str) -> Optional[dict]:
    """
    Carga el config de un bot. Valida el formato del bot_id
    y resuelve el path para prevenir path traversal.
    """
    # FIX #1: validar formato + resolver path y verificar que esta dentro de BOTS_DIR
    if not BOT_ID_REGEX.match(bot_id):
        return None
    path = (BOTS_DIR / f"{bot_id}.json").resolve()
    if not str(path).startswith(str(BOTS_DIR)):
        return None
    if not path.exists():
        return None
    return cast(Optional[dict[str, Any]], json.loads(path.read_text(encoding="utf-8")))


def _get_or_create(bot_id: str) -> WatchedProcess:
    if bot_id not in _MANAGER:
        cfg = _load_bot_config(bot_id)
        if not cfg:
            raise HTTPException(404, f"Bot '{bot_id}' no existe")
        _MANAGER[bot_id] = WatchedProcess(bot_id, cfg)
    return _MANAGER[bot_id]


def _validate_bot_id(bot_id: str) -> None:
    """FIX #1: helper que valida bot_id y raise 400 si es invalido."""
    if not BOT_ID_REGEX.match(bot_id):
        raise HTTPException(
            status_code=400,
            detail=f"bot_id invalido (debe ser [a-zA-Z0-9_-]{{1,64}})",
        )


# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class WatchdogAction(BaseModel):
    bot_id: str


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
router = APIRouter()


@router.get("/")
async def list_watchdogs(request: Request):
    """Lista todos los bots con watchdog activo."""
    _require_auth(request)
    items = [w.to_dict() for w in _MANAGER.values()]
    return {"watchdogs": items, "total": len(items)}


@router.get("/{bot_id}")
async def get_watchdog(bot_id: str, request: Request):
    """Estado de un watchdog especifico."""
    _require_auth(request)
    _validate_bot_id(bot_id)  # FIX #1
    w = _MANAGER.get(bot_id)
    if not w:
        # Si el bot tiene watchdog.enabled en su JSON, lo auto-registra
        cfg = _load_bot_config(bot_id)
        if not cfg:
            raise HTTPException(404, f"Bot '{bot_id}' no existe")
        if not cfg.get("watchdog", {}).get("enabled", False):
            raise HTTPException(404, f"Bot '{bot_id}' no tiene watchdog habilitado")
        w = _get_or_create(bot_id)
    return w.to_dict()


@router.post("/start")
async def start_watchdog(req: WatchdogAction, request: Request):
    """Inicia el watchdog de un bot (lanza el proceso + monitoreo)."""
    _require_auth(request)
    _validate_bot_id(req.bot_id)  # FIX #1
    w = _get_or_create(req.bot_id)
    if not w.config.get("watchdog", {}).get("enabled", False):
        raise HTTPException(400, f"Bot '{req.bot_id}' no tiene watchdog habilitado en su config")
    w.start()
    return {"ok": True, "watchdog": w.to_dict()}


@router.post("/stop")
async def stop_watchdog(req: WatchdogAction, request: Request):
    """Detiene el watchdog de un bot."""
    _require_auth(request)
    _validate_bot_id(req.bot_id)  # FIX #1
    w = _MANAGER.get(req.bot_id)
    if not w:
        raise HTTPException(404, f"No hay watchdog activo para '{req.bot_id}'")
    w.stop()
    del _MANAGER[req.bot_id]
    return {"ok": True, "stopped": req.bot_id}


@router.post("/restart")
async def restart_watchdog(req: WatchdogAction, request: Request):
    """Reinicia un watchdog (mata el proceso y vuelve a lanzar)."""
    _require_auth(request)
    _validate_bot_id(req.bot_id)  # FIX #1
    w = _get_or_create(req.bot_id)
    w.stop()
    await asyncio.sleep(0.5)
    w.start()
    return {"ok": True, "watchdog": w.to_dict()}


@router.post("/stop-all")
async def stop_all_watchdogs(request: Request):
    """Detiene TODOS los watchdogs activos."""
    _require_auth(request)
    stopped = []
    for bid in list(_MANAGER.keys()):
        _MANAGER[bid].stop()
        stopped.append(bid)
    _MANAGER.clear()
    return {"ok": True, "stopped": stopped}
