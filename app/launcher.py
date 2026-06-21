"""
============================================
app/launcher.py — Lanzador de bots con SSE
============================================

Port del commit 5 (6a89a62). Stream de la salida de un bot vía
Server-Sent Events usando subprocess.Popen + asyncio.

Flujo:
  1. Frontend abre EventSource('/api/launcher/run/<bot_id>')
  2. Backend lee el JSON del bot desde data/bots/<bot_id>.json
  3. Lanza el comando con subprocess.Popen
  4. Streamea stdout+stderr línea por línea al cliente
  5. Al terminar, emite un evento 'done' con exit_code
  6. Loguea todo en data/activity.jsonl

# MODIFICAR:
  - Soporte para profiles (commit 10) — leer bot_id + profile_id
  - Cancelación de bot en ejecución (guardar PID en memoria)
  - Rate limiting si lo necesitan los bots
"""
import asyncio
import json
import os
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.auth import is_authenticated

# ---------------------------------------------------------
# Paths
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
BOTS_DIR = BASE_DIR / "data" / "bots"
ACTIVITY_LOG = BASE_DIR / "data" / "activity.jsonl"

ACTIVITY_LOG.parent.mkdir(parents=True, exist_ok=True)

# Procesos activos en memoria (run_id -> {proc, bot_id})
# FIX #6: el valor ahora es un dict con el proc y el bot_id, para que stop_bot
# pueda filtrar por bot_id y no matar TODOS los procesos.
_RUNNING: dict[str, dict] = {}


# ---------------------------------------------------------
# Helpers
# ---------------------------------------------------------
def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


def _bot_path(bot_id: str) -> Path:
    """Sanitiza el bot_id para evitar path traversal."""
    safe = "".join(c for c in bot_id if c.isalnum() or c in "-_")
    if not safe or safe != bot_id:
        raise HTTPException(status_code=400, detail="bot_id inválido")
    return BOTS_DIR / f"{safe}.json"


def _load_bot(bot_id: str) -> dict:
    path = _bot_path(bot_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Bot '{bot_id}' no existe")
    return json.loads(path.read_text(encoding="utf-8"))


def _log_activity(entry: dict) -> None:
    """Append a JSONL line. No bloquea."""
    entry["ts"] = datetime.now(timezone.utc).isoformat()
    with ACTIVITY_LOG.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _sse(event: str, data: str | dict) -> str:
    """Formatea un mensaje SSE."""
    if isinstance(data, dict):
        data = json.dumps(data, ensure_ascii=False)
    return f"event: {event}\ndata: {data}\n\n"


# ---------------------------------------------------------
# Lectura de streams sin leak de tareas
# ---------------------------------------------------------
async def _drain_stream(stream, run_id: str, event_name: str) -> AsyncIterator[str]:
    """Lee un stream sin bloquear el event loop, emite SSE por linea."""
    loop = asyncio.get_event_loop()
    while True:
        line = await loop.run_in_executor(None, stream.readline)
        if not line:
            return
        yield _sse(event_name, {"run_id": run_id, "line": line.rstrip()})


async def _consume(gen) -> list[str]:
    """Consume un async generator y junta todos los chunks en una lista."""
    chunks: list[str] = []
    async for chunk in gen:
        chunks.append(chunk)
    return chunks


async def _read_both_streams(proc, run_id: str) -> AsyncIterator[str]:
    """
    Lee stdout y stderr en paralelo, sin leak de tareas.
    Cada stream tiene exactamente UNA tarea durante toda la vida del generador.
    """
    stdout_gen = _drain_stream(proc.stdout, run_id, "stdout")
    stderr_gen = _drain_stream(proc.stderr, run_id, "stderr")

    stdout_task = asyncio.create_task(_consume(stdout_gen))
    stderr_task = asyncio.create_task(_consume(stderr_gen))

    try:
        while not (stdout_task.done() and stderr_task.done()):
            done, _ = await asyncio.wait(
                {stdout_task, stderr_task},
                return_when=asyncio.FIRST_COMPLETED,
                timeout=0.5,
            )
            for d in done:
                try:
                    for chunk in d.result():
                        yield chunk
                except Exception as e:
                    yield _sse("stderr", {"run_id": run_id, "line": f"[reader error] {e}"})
            # Si el proceso ya murio y los streams se cerraron, salir
            if proc.poll() is not None and proc.stdout.closed and proc.stderr.closed:
                break
    finally:
        for t in (stdout_task, stderr_task):
            if not t.done():
                t.cancel()
            try:
                await t
            except (asyncio.CancelledError, Exception):
                pass


# ---------------------------------------------------------
# SSE Generator principal
# ---------------------------------------------------------
async def _stream_process(bot_id: str, run_id: str, cmd: list[str], cwd: Path | None) -> AsyncIterator[str]:
    """
    Lanza el comando y streamea stdout+stderr línea por línea vía SSE.
    Emite eventos: 'start', 'stdout', 'stderr', 'done'.
    """
    start_ts = time.time()
    yield _sse("start", {"run_id": run_id, "bot_id": bot_id, "cmd": cmd, "cwd": str(cwd) if cwd else None})
    _log_activity({"run_id": run_id, "bot_id": bot_id, "event": "start", "cmd": cmd})

    # Lanzar proceso
    if sys.platform == "win32":
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            creationflags=subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP,
        )
    else:
        proc = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            start_new_session=True,
        )

    _RUNNING[run_id] = {"proc": proc, "bot_id": bot_id}

    try:
        async for chunk in _read_both_streams(proc, run_id):
            yield chunk
    except Exception as e:
        yield _sse("stderr", {"run_id": run_id, "line": f"[launcher error] {e}"})
    finally:
        # FIX #2: garantizar terminacion del proceso y cleanup del dict
        # incluso si el cliente SSE se desconecta (GeneratorExit)
        if proc.poll() is None:
            try:
                if sys.platform == "win32":
                    subprocess.run(
                        ["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                        capture_output=True, timeout=5,
                    )
                else:
                    proc.terminate()
                    try:
                        proc.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                        proc.wait(timeout=3)
            except Exception:
                pass
        _RUNNING.pop(run_id, None)

    # Esperar a que termine
    loop = asyncio.get_event_loop()
    exit_code = await loop.run_in_executor(None, proc.wait)
    duration = time.time() - start_ts

    yield _sse("done", {
        "run_id": run_id,
        "bot_id": bot_id,
        "exit_code": exit_code,
        "duration_s": round(duration, 2),
    })
    _log_activity({
        "run_id": run_id, "bot_id": bot_id, "event": "done",
        "exit_code": exit_code, "duration_s": round(duration, 2),
    })


# ---------------------------------------------------------
# Router
# ---------------------------------------------------------
router = APIRouter()


class RunRequest(BaseModel):
    args: list[str] = []      # argumentos extra para el comando


@router.get("/run/{bot_id}")
async def run_bot_sse(bot_id: str, request: Request, args: str = ""):
    """
    Endpoint SSE principal.
    Uso desde el frontend:
        new EventSource('/api/launcher/run/mi-bot?args=--verbose')
    """
    _require_auth(request)

    bot = _load_bot(bot_id)
    cmd = bot.get("command")
    if not cmd:
        raise HTTPException(status_code=400, detail="El bot no tiene 'command' definido")

    if isinstance(cmd, str):
        cmd = [cmd]
    if args.strip():
        cmd.extend(args.split())

    cwd_raw = bot.get("cwd")
    cwd = Path(cwd_raw).resolve() if cwd_raw else None
    if cwd and not cwd.exists():
        raise HTTPException(status_code=400, detail=f"cwd no existe: {cwd}")

    run_id = str(uuid.uuid4())[:8]
    return StreamingResponse(
        _stream_process(bot_id, run_id, cmd, cwd),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx
            "Connection": "keep-alive",
        },
    )


@router.post("/run/{bot_id}/sync")
async def run_bot_sync(bot_id: str, request: Request, req: RunRequest | None = None):
    """
    Versión sin SSE: ejecuta el bot y devuelve la salida completa
    cuando termina. Útil para tests y bots rápidos.
    El body es opcional: si no se manda, ejecuta el comando base del bot.
    """
    _require_auth(request)
    if req is None:
        req = RunRequest()
    bot = _load_bot(bot_id)
    cmd = bot.get("command")
    if not cmd:
        raise HTTPException(status_code=400, detail="El bot no tiene 'command' definido")
    if isinstance(cmd, str):
        cmd = [cmd]
    cmd.extend(req.args)

    cwd_raw = bot.get("cwd")
    cwd = str(Path(cwd_raw).resolve()) if cwd_raw else None

    start = time.time()
    try:
        result = subprocess.run(
            cmd,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=300,
        )
        duration = time.time() - start
        _log_activity({
            "bot_id": bot_id, "event": "sync_done",
            "exit_code": result.returncode, "duration_s": round(duration, 2),
        })
        return {
            "ok": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "duration_s": round(duration, 2),
        }
    except subprocess.TimeoutExpired:
        _log_activity({"bot_id": bot_id, "event": "timeout"})
        raise HTTPException(status_code=408, detail="Bot tardó más de 300s")
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=f"Comando no encontrado: {e}")


@router.post("/run/{bot_id}/stop")
async def stop_bot(bot_id: str, request: Request):
    """
    Detiene SOLO los procesos del bot_id especificado.
    FIX #6: el comportamiento anterior mataba TODOS los procesos activos,
    no solo los del bot que se pedía detener.
    """
    _require_auth(request)
    stopped = []
    for run_id, entry in list(_RUNNING.items()):
        # FIX #6: filtrar por bot_id en lugar de matar todo
        if entry["bot_id"] != bot_id:
            continue
        proc = entry["proc"]
        if proc.poll() is None:
            try:
                if sys.platform == "win32":
                    subprocess.run(
                        ["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                        capture_output=True, timeout=5,
                    )
                else:
                    proc.terminate()
                    try:
                        proc.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        proc.kill()
                        proc.wait(timeout=3)
                stopped.append(run_id)
            except Exception:
                pass
    return {"ok": True, "stopped_runs": stopped}


@router.get("/running")
async def list_running(request: Request):
    """Lista los bots que están corriendo ahora."""
    _require_auth(request)
    return {
        "running": [
            {"run_id": rid, "bot_id": entry["bot_id"], "pid": entry["proc"].pid}
            for rid, entry in _RUNNING.items()
        ]
    }
