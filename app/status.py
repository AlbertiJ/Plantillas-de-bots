"""
============================================
app/status.py — Estado del sistema
============================================

Port del commit 4 (b2c4265). Metricas en vivo: CPU, RAM, bots corriendo,
ultimo evento del activity log.

Usa psutil si esta disponible, sino devuelve fallback con 0.
Los procesos de bots se cuentan consultando el launcher._RUNNING.

# MODIFICAR: agregar metricas por bot (cpu/ram de cada proceso)
"""
import os
import platform
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from app.auth import is_authenticated

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

BASE_DIR = Path(__file__).resolve().parent.parent
ACTIVITY_LOG = BASE_DIR / "data" / "activity.jsonl"

STARTED_AT = time.time()


def _require_auth(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(status_code=401, detail="No autenticado")


def _last_activity() -> Optional[str]:
    """Lee la ultima linea de activity.jsonl sin cargar todo."""
    if not ACTIVITY_LOG.exists():
        return None
    try:
        # leer las ultimas ~4KB es suficiente
        with ACTIVITY_LOG.open("rb") as f:
            f.seek(0, 2)
            size = f.tell()
            f.seek(max(0, size - 4096))
            tail = f.read().decode("utf-8", errors="ignore")
        lines = [l for l in tail.splitlines() if l.strip()]
        if not lines:
            return None
        import json
        return json.loads(lines[-1]).get("ts")
    except Exception:
        return None


def _count_running_bots() -> int:
    """Cuenta los bots corriendo via launcher._RUNNING."""
    try:
        from app.launcher import _RUNNING
        return len(_RUNNING)
    except Exception:
        return 0


router = APIRouter()


@router.get("/")
async def system_status(request: Request):
    """Metricas del sistema en vivo."""
    _require_auth(request)
    out = {
        "ok": True,
        "uptime_s": round(time.time() - STARTED_AT, 1),
        "psutil_available": HAS_PSUTIL,
    }

    if HAS_PSUTIL:
        try:
            out["cpu"] = psutil.cpu_percent(interval=0.1)
            vm = psutil.virtual_memory()
            out["ram"] = vm.percent
            out["ram_used_mb"] = round(vm.used / 1024 / 1024, 1)
            out["ram_total_mb"] = round(vm.total / 1024 / 1024, 1)
            out["disk"] = psutil.disk_usage("/").percent
        except Exception as e:
            out["metrics_error"] = str(e)
    else:
        out["cpu"] = None
        out["ram"] = None
        out["warning"] = "psutil no instalado — pip install psutil para metricas reales"

    out["bots_running"] = _count_running_bots()
    out["last_activity"] = _last_activity()

    out["system"] = {
        "platform": platform.system(),
        "python": platform.python_version(),
        "node": platform.node(),
    }

    return out


@router.get("/health")
async def health(request: Request):
    """Healthcheck publico (sin auth) — para docker/k8s."""
    return {"ok": True, "ts": datetime.now(timezone.utc).isoformat()}


@router.get("/processes")
async def list_processes(request: Request, bot_only: bool = False):
    """Lista procesos del sistema (filtrable a bots si psutil disponible)."""
    _require_auth(request)
    if not HAS_PSUTIL:
        raise HTTPException(503, "psutil no instalado")

    procs = []
    for p in psutil.process_iter(["pid", "name", "username", "memory_info", "cmdline"]):
        try:
            info = p.info
            cmdline = " ".join(info.get("cmdline") or [])
            if bot_only and "python" not in cmdline.lower():
                continue
            procs.append({
                "pid": info["pid"],
                "name": info["name"],
                "username": info["username"],
                "memory_mb": round(info["memory_info"].rss / 1024 / 1024, 1) if info.get("memory_info") else 0,
                "cmdline": cmdline[:200] if cmdline else "",
            })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    procs.sort(key=lambda x: -x["memory_mb"])
    return {"processes": procs[:50], "total": len(procs), "bot_only": bot_only}
