"""
============================================
main.py — Plantillas-de-bots (Python port)
============================================

FastAPI app principal. Maneja el ciclo de vida:
- first-run: genera clave admin aleatoria si no hay credenciales
- startup: carga .env, prepara data/ y monta routers
- shutdown: limpia recursos

# MODIFICAR: agregar routers a medida que se porten los demás commits.
Orden planeado: auth → admin → launcher → activity → builder → ctf_osint
               → libraries → ctf_templates → watchdog → status
"""
import os
import secrets
import shutil
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app import auth, admin, launcher, activity, builder
from app import ctf_osint, libraries, ctf_templates, watchdog, status
from app import botfather, favicon
from app.config import settings

# Forzar UTF-8 en stdout (Windows cp1252 rompe con emojis)
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

# ---------------------------------------------------------
# Rutas base
# ---------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
CREDENTIALS_DIR = DATA_DIR / "credentials"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------
# First-run: generar clave admin aleatoria
# ---------------------------------------------------------
def _ensure_admin_credentials() -> None:
    """
    Si no hay credenciales, crea una con clave aleatoria y la imprime
    en consola. El usuario debe leerla, hacer login y cambiarla.
    """
    existing = list(CREDENTIALS_DIR.glob("cred-*.json"))
    if existing:
        return  # ya está inicializado

    initial_password = secrets.token_urlsafe(16)
    auth.create_credential(
        username="admin",
        password=initial_password,
        must_change=True,
    )
    # Banner de primer arranque (sin emojis para no romper cp1252)
    banner = (
        "\n" + "=" * 60 + "\n"
        "  PLANTILLAS-DE-BOTS - PRIMER ARRANQUE\n"
        + "=" * 60 + "\n"
        f"  Usuario: admin\n"
        f"  Clave temporal: {initial_password}\n"
        "  Pegala en /login y cambiala cuando te lo pida.\n"
        + "=" * 60 + "\n"
    )
    print(banner)


# ---------------------------------------------------------
# Lifespan: startup + shutdown
# ---------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ---- STARTUP ----
    _ensure_admin_credentials()
    yield
    # ---- SHUTDOWN ----
    # MODIFICAR: cerrar handles, flush de buffers, etc.


# ---------------------------------------------------------
# App
# ---------------------------------------------------------
app = FastAPI(
    title="Plantillas-de-bots",
    version="1.0.0",
    description="Rediseño Python del proyecto original (FastAPI + Jinja2).",
    lifespan=lifespan,
)

# Static y templates
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(launcher.router, prefix="/api/launcher", tags=["launcher"])
app.include_router(activity.router, prefix="/api/activity", tags=["activity"])
app.include_router(builder.router, prefix="/api/builder", tags=["builder"])
app.include_router(ctf_osint.router, prefix="/api/ctf-osint", tags=["ctf-osint"])
app.include_router(libraries.router, prefix="/api/libraries", tags=["libraries"])
app.include_router(ctf_templates.router, prefix="/api/ctf-templates", tags=["ctf-templates"])
app.include_router(watchdog.router, prefix="/api/watchdog", tags=["watchdog"])
app.include_router(status.router, prefix="/api/status", tags=["status"])
app.include_router(botfather.router, prefix="/api/botfather", tags=["botfather"])
app.include_router(favicon.router)


# ---------------------------------------------------------
# Páginas (HTML server-side con Jinja2)
# ---------------------------------------------------------
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    # Si no está logueado → /login; si sí → /admin
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return RedirectResponse(url="/admin", status_code=302)


@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})


@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("admin.html", {"request": request})


@app.get("/launcher", response_class=HTMLResponse)
async def launcher_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("launcher.html", {"request": request})


@app.get("/activity", response_class=HTMLResponse)
async def activity_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("activity.html", {"request": request})


@app.get("/builder", response_class=HTMLResponse)
async def builder_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("builder.html", {"request": request})


@app.get("/ctf-osint", response_class=HTMLResponse)
async def ctf_osint_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("ctf-osint.html", {"request": request})


@app.get("/libraries", response_class=HTMLResponse)
async def libraries_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("libraries.html", {"request": request})


@app.get("/ctf-templates", response_class=HTMLResponse)
async def ctf_templates_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("ctf-templates.html", {"request": request})


@app.get("/watchdog", response_class=HTMLResponse)
async def watchdog_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("watchdog.html", {"request": request})


@app.get("/status", response_class=HTMLResponse)
async def status_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("status.html", {"request": request})


@app.get("/botfather", response_class=HTMLResponse)
async def botfather_page(request: Request):
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("botfather.html", {"request": request})


@app.get("/change-password", response_class=HTMLResponse)
async def change_password_page(request: Request):
    """Pagina para cambiar la clave cuando must_change=true."""
    if not auth.is_authenticated(request):
        return RedirectResponse(url="/login", status_code=302)
    return templates.TemplateResponse("change_password.html", {"request": request, "hide_header": True})


# ---------------------------------------------------------
# Healthcheck (para systemd / docker / etc.)
# ---------------------------------------------------------
@app.get("/healthz")
async def healthz():
    return {"status": "ok", "env": settings.env}
