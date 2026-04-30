#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_install.py — Verificador de instalación local
====================================================
Ejecutar desde la raíz del repositorio:
    python3 check_install.py

Genera un informe en consola y guarda check_report.txt.
No requiere dependencias externas (solo librería estándar de Python).
"""

import sys
import os
import shutil
import subprocess
import importlib.util
import platform
import json
from pathlib import Path
from datetime import datetime

# ── Colores ANSI ─────────────────────────────────────────────────────────────
USE_COLOR = sys.stdout.isatty() and platform.system() != "Windows"

def c(text: str, code: str) -> str:
    return f"\033[{code}m{text}\033[0m" if USE_COLOR else text

GREEN  = lambda t: c(t, "92")
RED    = lambda t: c(t, "91")
YELLOW = lambda t: c(t, "93")
CYAN   = lambda t: c(t, "96")
BOLD   = lambda t: c(t, "1")
DIM    = lambda t: c(t, "2")
BLUE   = lambda t: c(t, "94")

OK   = GREEN("  ✓")
FAIL = RED("  ✗")
WARN = YELLOW("  !")
INFO = BLUE("  →")

# ── Registro de resultados ────────────────────────────────────────────────────
results: list[dict] = []

def check(category: str, name: str, ok: bool, detail: str = "", fix: str = "", warn: bool = False):
    status = "ok" if ok else ("warn" if warn else "fail")
    results.append({"category": category, "name": name, "status": status, "detail": detail, "fix": fix})
    icon = OK if ok else (WARN if warn else FAIL)
    msg = f"{icon}  {name}"
    if detail:
        msg += f"  {DIM(detail)}"
    print(msg)
    if not ok and fix:
        print(f"      {YELLOW('→')} {fix}")

def header(title: str):
    width = 60
    print()
    print(BOLD(CYAN("─" * width)))
    print(BOLD(CYAN(f"  {title}")))
    print(BOLD(CYAN("─" * width)))

def run_cmd(cmd: list[str], timeout: int = 8) -> tuple[bool, str]:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        out = (r.stdout + r.stderr).strip()
        return r.returncode == 0, out
    except (FileNotFoundError, subprocess.TimeoutExpired, PermissionError) as e:
        return False, str(e)

# ── Raíz del repo ─────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).parent.resolve()

# ── Catálogo de archivos de bots ──────────────────────────────────────────────
BOT_FILES = [
    # Telegram básicos
    "bots/telegram/echo_bot.py",
    "bots/telegram/commands_bot.py",
    "bots/telegram/inline_keyboard_bot.py",
    "bots/telegram/files_bot.py",
    "bots/telegram/poll_bot.py",
    "bots/telegram/group_admin_bot.py",
    "bots/telegram/scheduler_bot.py",
    "bots/telegram/sqlite_bot.py",
    "bots/telegram/conv_handler_bot.py",
    # Telegram IA
    "bots/telegram/agent_openai_basic.py",
    "bots/telegram/agent_anthropic_tools.py",
    "bots/telegram/agent_websearch.py",
    "bots/telegram/agent_vision.py",
    "bots/telegram/agent_rag_documents.py",
    # CTF/OSINT Telegram
    "bots/ctf-osint/tg_01_ip_geo_whois.py",
    "bots/ctf-osint/tg_02_dns_recon.py",
    "bots/ctf-osint/tg_03_hash_suite.py",
    "bots/ctf-osint/tg_04_encoding_knife.py",
    "bots/ctf-osint/tg_05_sqli_builder.py",
    # WhatsApp
    "bots/whatsapp/webhook_basic.py",
    "bots/whatsapp/chatgpt_integration.py",
    "bots/whatsapp/command_router.py",
    "bots/whatsapp/media_messages.py",
    "bots/whatsapp/sqlite_database.py",
    "bots/whatsapp/group_multiuser.py",
    "bots/whatsapp/scheduler_apscheduler.py",
    "bots/whatsapp/auto_language_detect.py",
    "bots/whatsapp/agent_openai_persistent.py",
    "bots/whatsapp/order_tracker.py",
    # CTF/OSINT WhatsApp
    "bots/ctf-osint/wa_01_ip_geo.py",
    "bots/ctf-osint/wa_02_headers_tech.py",
    "bots/ctf-osint/wa_03_hash_suite.py",
    "bots/ctf-osint/wa_04_encoding.py",
    "bots/ctf-osint/wa_05_ctf_toolkit.py",
    # Utilidad
    "watchdog_bot.py",
]

# ── Paquetes Python a verificar ────────────────────────────────────────────────
PACKAGES = [
    # (nombre_pip, import_name, opcional, descripcion)
    ("python-dotenv",        "dotenv",              False, "Carga .env"),
    ("requests",             "requests",            False, "HTTP client"),
    ("python-telegram-bot",  "telegram",            False, "API Telegram"),
    ("flask",                "flask",               False, "Webhooks WhatsApp"),
    ("twilio",               "twilio",              False, "API Twilio/WhatsApp"),
    ("apscheduler",          "apscheduler",         False, "Mensajes programados"),
    ("beautifulsoup4",       "bs4",                 False, "Web scraping"),
    ("dnspython",            "dns",                 False, "Consultas DNS (CTF)"),
    ("python-whois",         "whois",               True,  "Whois lookup (CTF)"),
    ("tldextract",           "tldextract",          True,  "Parser dominios (CTF)"),
    ("openai",               "openai",              True,  "OpenAI (agentes IA)"),
    ("anthropic",            "anthropic",           True,  "Anthropic (agentes IA)"),
    ("google-generativeai",  "google.generativeai", True,  "Gemini (agentes IA)"),
    ("rich",                 "rich",                True,  "Output bonito"),
    ("lxml",                 "lxml",                True,  "Parser HTML rápido"),
]

# ── Variables esperadas en .env ───────────────────────────────────────────────
ENV_VARS = [
    ("TELEGRAM_BOT_TOKEN", False, "Token del bot Telegram (de @BotFather)"),
    ("TWILIO_ACCOUNT_SID", True,  "Twilio Account SID (bots WhatsApp)"),
    ("TWILIO_AUTH_TOKEN",  True,  "Twilio Auth Token (bots WhatsApp)"),
    ("TWILIO_PHONE",       True,  "Número Twilio WhatsApp (whatsapp:+1...)"),
    ("OPENAI_API_KEY",     True,  "OpenAI API key (agentes IA, opcional)"),
    ("ANTHROPIC_API_KEY",  True,  "Anthropic API key (opcional)"),
]


# ══════════════════════════════════════════════════════════════════════════════
#  1. ENTORNO
# ══════════════════════════════════════════════════════════════════════════════
header("1 · ENTORNO DEL SISTEMA")

# Sistema operativo
so = platform.system()
ver = platform.version()
check("entorno", f"Sistema operativo: {so} {platform.machine()}", True, ver[:60])

# Python
py_ver = sys.version_info
py_ok  = py_ver >= (3, 10)
check(
    "entorno", f"Python {sys.version.split()[0]}",
    py_ok,
    "(requerido >= 3.10)",
    "Instalá Python 3.10+ desde https://python.org" if not py_ok else "",
)

# pip
pip_ok, pip_out = run_cmd([sys.executable, "-m", "pip", "--version"])
check("entorno", "pip disponible", pip_ok,
      pip_out.split()[1] if pip_ok else "",
      "Ejecutá: python3 -m ensurepip --upgrade")

# pip list (para verificar paquetes después)
_, pip_list_raw = run_cmd([sys.executable, "-m", "pip", "list", "--format=json"])
try:
    pip_installed = {p["name"].lower(): p["version"] for p in json.loads(pip_list_raw)}
except Exception:
    pip_installed = {}

# Node.js
node_ok, node_out = run_cmd(["node", "--version"])
node_ver = node_out.lstrip("v") if node_ok else ""
node_min = node_ok and tuple(int(x) for x in node_ver.split(".")[:1]) >= (16,)
check("entorno", f"Node.js", node_min,
      node_out if node_ok else "no encontrado",
      "Instalá Node.js >= 16 desde https://nodejs.org" if not node_min else "")

# pnpm
pnpm_ok, pnpm_out = run_cmd(["pnpm", "--version"])
check("entorno", "pnpm", pnpm_ok,
      f"v{pnpm_out}" if pnpm_ok else "no encontrado",
      "Instalá pnpm: npm install -g pnpm" if not pnpm_ok else "")

# git
git_ok, git_out = run_cmd(["git", "--version"])
check("entorno", "git", git_ok,
      git_out if git_ok else "no encontrado",
      "Instalá git: sudo apt install git  /  https://git-scm.com")


# ══════════════════════════════════════════════════════════════════════════════
#  2. ESTRUCTURA DEL REPOSITORIO
# ══════════════════════════════════════════════════════════════════════════════
header("2 · ESTRUCTURA DEL REPOSITORIO")

print(f"  {DIM('Raíz:')} {REPO_ROOT}")

KEY_FILES = [
    ("setup.sh",                  "Script de configuración inicial"),
    ("start.sh",                  "Script de inicio rápido"),
    ("package.json",              "Workspace Node.js"),
    ("bots/requirements.txt",     "Dependencias Python de los bots"),
    ("artifacts/api-server",      "Panel — servidor API"),
    ("artifacts/bot-templates",   "Panel — frontend"),
    ("bots/telegram",             "Carpeta bots Telegram"),
    ("bots/whatsapp",             "Carpeta bots WhatsApp"),
    ("bots/ctf-osint",            "Carpeta bots CTF/OSINT"),
]

for path, desc in KEY_FILES:
    full = REPO_ROOT / path
    exists = full.exists()
    check("repo", f"{path}", exists, desc,
          f"Hacé: git pull origin main  (falta {path})" if not exists else "")


# ══════════════════════════════════════════════════════════════════════════════
#  3. ARCHIVOS DE BOTS (35 plantillas)
# ══════════════════════════════════════════════════════════════════════════════
header("3 · ARCHIVOS DE BOTS (35 plantillas)")

missing_bots = []
for bf in BOT_FILES:
    full = REPO_ROOT / bf
    exists = full.exists()
    if not exists:
        missing_bots.append(bf)
    check("bots", bf, exists, "",
          "Ejecutá: git pull origin main" if not exists else "")

if missing_bots:
    print()
    print(f"  {WARN}  {len(missing_bots)} archivo(s) faltante(s). Solución rápida:")
    print(f"       {CYAN('git pull origin main')}")
else:
    print()
    print(f"  {OK}  Todos los archivos de bots están presentes.")


# ══════════════════════════════════════════════════════════════════════════════
#  4. PAQUETES PYTHON
# ══════════════════════════════════════════════════════════════════════════════
header("4 · PAQUETES PYTHON")

missing_required = []
missing_optional = []

for pip_name, import_name, optional, desc in PACKAGES:
    # Intentar import primero, luego buscar en pip list
    try:
        parts = import_name.split(".")
        spec  = importlib.util.find_spec(parts[0])
        found = spec is not None
    except ModuleNotFoundError:
        found = False

    # Buscar versión en pip list
    version = ""
    for key in [pip_name.lower(), pip_name.lower().replace("-","_")]:
        if key in pip_installed:
            version = pip_installed[key]
            break

    label = f"{pip_name}" + (f"  {DIM('(opcional)')} " if optional else "")
    fix   = f"pip install {pip_name}"
    check("packages", label, found,
          f"v{version}" if (found and version) else (desc if not found else desc),
          fix if not found else "",
          warn=optional and not found)

    if not found:
        (missing_optional if optional else missing_required).append(pip_name)

if missing_required or missing_optional:
    print()
    all_missing = missing_required + missing_optional
    print(f"  {INFO}  Instalación rápida de todo:")
    print(f"       {CYAN('pip install -r bots/requirements.txt')}")
    if missing_required:
        print()
        print(f"  {FAIL}  Requeridos faltantes: {', '.join(missing_required)}")
        print(f"       {CYAN(f'pip install {\" \".join(missing_required)}')}")


# ══════════════════════════════════════════════════════════════════════════════
#  5. CONFIGURACIÓN — ARCHIVO .env
# ══════════════════════════════════════════════════════════════════════════════
header("5 · CONFIGURACIÓN (.env)")

env_path = REPO_ROOT / ".env"
env_exists = env_path.exists()
check("env", "Archivo .env existe", env_exists,
      str(env_path) if env_exists else "",
      "Copiá .env.example como .env:  cp .env.example .env  (luego completá tus tokens)")

env_values: dict[str, str] = {}
if env_exists:
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            env_values[k.strip()] = v.strip()

for var, optional, desc in ENV_VARS:
    val  = env_values.get(var, "")
    has  = bool(val) and val not in ("tu_token_aquí", "your_value_here", "CAMBIAR", "")
    label = f"{var}"
    if not env_exists:
        check("env", label, False, desc,
              f"Creá el .env y agregá:  {var}=tu_valor", warn=optional)
    elif not has:
        check("env", label, False,
              "⚠ vacío o con valor placeholder" if val else "⚠ no definido",
              f"Editá .env y completá:  {var}=tu_valor_real",
              warn=optional)
    else:
        check("env", label, True,
              f"{'*' * min(len(val)-4, 8)}{val[-4:]}" if len(val) > 4 else "****")


# ══════════════════════════════════════════════════════════════════════════════
#  6. PANEL ADMIN — dependencias Node.js
# ══════════════════════════════════════════════════════════════════════════════
header("6 · PANEL ADMIN (Node.js / pnpm)")

nm = REPO_ROOT / "node_modules"
nm_ok = nm.exists() and any(nm.iterdir())
check("panel", "node_modules instalados", nm_ok,
      "OK" if nm_ok else "no encontrado",
      "Ejecutá: pnpm install")

api_pkg = REPO_ROOT / "artifacts" / "api-server" / "package.json"
fe_pkg  = REPO_ROOT / "artifacts" / "bot-templates" / "package.json"
check("panel", "artifacts/api-server/package.json", api_pkg.exists())
check("panel", "artifacts/bot-templates/package.json", fe_pkg.exists())

# Intentar verificar si el panel está corriendo
import urllib.request, urllib.error
panel_running = False
api_url = os.getenv("VITE_API_URL", "http://localhost:3001")
try:
    req = urllib.request.urlopen(f"{api_url}/api/healthz", timeout=2)
    panel_running = req.status == 200
except Exception:
    pass

check("panel", f"API server corriendo ({api_url}/api/healthz)",
      panel_running,
      "OK — conectado" if panel_running else "no responde (normal si no está iniciado)",
      "Iniciá el panel con: ./start.sh",
      warn=not panel_running)


# ══════════════════════════════════════════════════════════════════════════════
#  7. CONEXIÓN A INTERNET
# ══════════════════════════════════════════════════════════════════════════════
header("7 · CONECTIVIDAD")

for host, label in [("8.8.8.8", "DNS Google"), ("api.telegram.org", "Telegram API"), ("api.openai.com", "OpenAI API")]:
    ok, out = run_cmd(["ping", "-c", "1", "-W", "3", host] if platform.system() != "Windows"
                     else ["ping", "-n", "1", "-w", "3000", host], timeout=5)
    check("net", label, ok,
          "alcanzable" if ok else "sin respuesta",
          "Verificá tu conexión a internet" if not ok else "",
          warn=not ok)


# ══════════════════════════════════════════════════════════════════════════════
#  RESUMEN FINAL
# ══════════════════════════════════════════════════════════════════════════════
header("RESUMEN FINAL")

total   = len(results)
ok_n    = sum(1 for r in results if r["status"] == "ok")
warn_n  = sum(1 for r in results if r["status"] == "warn")
fail_n  = sum(1 for r in results if r["status"] == "fail")

print(f"\n  {BOLD('Total de verificaciones:')} {total}")
print(f"  {GREEN(f'✓ {ok_n} correctas')}")
if warn_n:
    print(f"  {YELLOW(f'! {warn_n} advertencias (opcionales)')}")
if fail_n:
    print(f"  {RED(f'✗ {fail_n} errores')}")

READY = fail_n == 0

if READY:
    print()
    print(f"  {GREEN(BOLD('✓ TODO OK — el repositorio está listo para usar.'))}")
    print(f"  Iniciá el panel con: {CYAN('./start.sh')}")
else:
    print()
    print(f"  {RED(BOLD('✗ Hay errores que resolver antes de usar los bots:'))}")
    for r in results:
        if r["status"] == "fail":
            print(f"    • {r['name']}")
            if r["fix"]:
                print(f"      {YELLOW('→')} {r['fix']}")

print()
print(BOLD("Guía rápida de instalación desde cero:"))
print(f"  {DIM('1.')} sudo apt install python3 python3-pip git nodejs npm   {DIM('# Ubuntu/Debian')}")
print(f"  {DIM('2.')} npm install -g pnpm")
print(f"  {DIM('3.')} pip install -r bots/requirements.txt")
print(f"  {DIM('4.')} cp .env.example .env && nano .env                   {DIM('# completá tus tokens')}")
print(f"  {DIM('5.')} pnpm install")
print(f"  {DIM('6.')} ./setup.sh                                          {DIM('# primera vez')}")
print(f"  {DIM('7.')} ./start.sh                                          {DIM('# inicio rápido')}")


# ══════════════════════════════════════════════════════════════════════════════
#  GUARDAR INFORME EN ARCHIVO
# ══════════════════════════════════════════════════════════════════════════════
report_path = REPO_ROOT / "check_report.txt"

lines = [
    f"INFORME DE VERIFICACIÓN — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
    f"Repositorio: {REPO_ROOT}",
    f"Sistema:     {platform.system()} {platform.machine()} | Python {sys.version.split()[0]}",
    "=" * 60,
    f"Total: {total}  |  OK: {ok_n}  |  Advertencias: {warn_n}  |  Errores: {fail_n}",
    "=" * 60,
]

current_cat = ""
for r in results:
    if r["category"] != current_cat:
        current_cat = r["category"]
        labels = {"entorno":"ENTORNO","repo":"REPOSITORIO","bots":"ARCHIVOS DE BOTS",
                  "packages":"PAQUETES PYTHON","env":"CONFIGURACIÓN .env",
                  "panel":"PANEL ADMIN","net":"CONECTIVIDAD"}
        lines.append(f"\n[{labels.get(current_cat, current_cat.upper())}]")
    icon = "✓" if r["status"] == "ok" else ("!" if r["status"] == "warn" else "✗")
    lines.append(f"  {icon} {r['name']}")
    if r["status"] != "ok" and r["fix"]:
        lines.append(f"      → {r['fix']}")

lines.append("\n" + "=" * 60)
lines.append("ESTADO GENERAL: " + ("✓ LISTO" if READY else "✗ REQUIERE CORRECCIONES"))

report_path.write_text("\n".join(lines), encoding="utf-8")
print()
print(f"  {DIM(f'Informe guardado en: {report_path}')}")
print()
