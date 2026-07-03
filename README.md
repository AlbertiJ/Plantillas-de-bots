# 🤖 plantillas-de-bots

**Panel admin para tus bots de Telegram/Discord.**
Lanzá, supervisá y recuperá bots sin escribir comandos.
FastAPI + Python 3.12. Listo para Docker. Auditado en seguridad (v1.0.1).

[![Tests](https://img.shields.io/badge/tests-168_passing-brightgreen)]()
[![Mypy](https://img.shields.io/badge/mypy-0_errors-blue)]()
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue)]()
[![License: MIT](https://img.shields.io/badge/license-MIT-green)]()
[![Docker](https://img.shields.io/badge/docker-ready-blue)]()
[![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg)](https://github.com/psf/black)

![demo](docs/img/demo.gif) <!-- TODO: agregar GIF demo -->

---

## ¿Qué problema resuelve?

Administrar bots de Telegram desde scripts sueltos es un caos:
- "se cayó, no sé hace cuánto"
- "lo reinicié 5 veces hoy, otra vez a las 3am"
- "¿dónde está el log de ayer?"
- "¿qué bot está corriendo ahora mismo?"

**`plantillas-de-bots` te da:**
- 📊 Panel web para ver todos tus bots en un lugar
- 🔁 Watchdog que reinicia automáticamente los que se caen
- 📜 Histórico de ejecuciones (qué arrancó, qué terminó, qué falló)
- 🔐 Auth + admin de tokens desde la UI (sin tocar el `.env`)
- 📡 SSE en vivo: ves el output del bot mientras corre
- 🐳 Docker-compose listo para producción con HTTPS

**Para quién:**
- Equipos chicos de operaciones que corren varios bots
- Practicantes de OSINT/CTF que quieren unificar sus herramientas
- Cualquiera que mantiene bots personales y quiere saber qué pasa sin loguearse al server

---

## Quick start

```bash
# Opción 1: Docker (recomendado, ~2 min)
git clone https://github.com/AlbertiJ/Plantillas-de-bots.git
cd Plantillas-de-bots
docker compose up -d
# Abrir http://localhost

# Opción 2: Python puro
git clone https://github.com/AlbertiJ/Plantillas-de-bots.git
cd Plantillas-de-bots
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload
```

**Primer arranque:** el server genera una clave admin aleatoria y la imprime en consola. Pegala en `/login`, cambiala, listo.

> Más detalle: [`docs/QUICKSTART.md`](docs/QUICKSTART.md) (próximamente)

---

## Features

| | |
|---|---|
| 🔐 **Auth** | Sesión con cookie httponly + admin de tokens del `.env` desde la UI |
| 🤖 **Bot launcher** | Lanza bots vía SSE, ves stdout/stderr en vivo, botón "Detener" mata el proceso |
| 👀 **Watchdog** | Si un bot muere, lo reinicia (con cap de restarts para evitar loops) |
| 📜 **Activity log** | Histórico de cada ejecución: cuándo arrancó, qué exit code, cuánto tardó |
| 🔧 **BotFather** | Cambia nombre/descripción/comandos de tus bots desde la UI (vía Telegram Bot API) |
| 🛠️ **CTF OSINT** | Catálogo de herramientas de reconocimiento preconfiguradas |
| 📚 **Libraries** | Repositorio centralizado de bots y librerías |
| 🎨 **CTF Templates** | Comandos pre-armados con placeholders (nmap, dnsx, etc.) |
| 📊 **Status** | CPU, RAM, bots corriendo, último evento |
| ⚡ **Rate limiting** | Anti brute-force en login, anti abuse en launcher |
| 📜 **Logrotate** | `activity.jsonl` se rota solo cuando llega a 5 MB |
| 🧱 **Type-safe** | mypy 0 errores en 16 archivos |
| 🪵 **Logging estructurado** | structlog con JSON en prod, colores en dev |
| 🐳 **Docker** | Multi-stage, no-root, healthcheck, red interna |
| 🔒 **HTTPS** | Caddy como reverse proxy (auto Let's Encrypt) |

---

## Capturas

<!-- TODO: agregar screenshots reales -->

| Panel admin | Launcher (bot corriendo) | Watchdog status |
|---|---|---|
| ![](docs/img/admin.png) | ![](docs/img/launcher.png) | ![](docs/img/watchdog.png) |

---

## Casos de uso

- **Pentester freelance** que corre 8 bots de Telegram simultáneamente y no quiere loguearse al VPS cada vez que uno se cae
- **CISO de pyme** que necesita un panel simple para que su equipo supervise los bots de seguridad interna
- **CTF player** que tiene una docena de scripts OSINT y quiere lanzarlos desde una UI en vez de la terminal
- **Dev** que hace side-projects con Telegram y quiere ver logs sin ssh al server

---

## Stack

- **Backend:** FastAPI (Python 3.12), async, pydantic 2
- **Frontend:** Jinja2 templates + CSS variables + JS vanilla (sin React/Vue)
- **Auth:** cookie httponly + bcrypt (passlib)
- **Storage:** archivos JSON (`data/bots/*.json`), sin DB
- **Logging:** structlog (JSON en prod, colores en dev)
- **Tests:** pytest, 168 tests, 0 mypy errors
- **Deploy:** Docker Compose + Caddy reverse proxy + Let's Encrypt

---

## Status del proyecto

| Métrica | Valor |
|---|---|
| Tests pasando | **168** ✅ |
| Errores mypy | **0** ✅ |
| Bugs críticos arreglados | **16** (auditoría 2026-06) |
| Líneas de código | ~5000 |
| Dependencias core | 11 (ver `requirements.txt`) |
| Dependencias test | 2 |
| Dependencias opcionales (CI/E2E) | 2 |
| Tiempo de setup con Docker | ~2 min |
| Tiempo de auditoría | 1 día de 4 agentes |

Ver [`HISTORIAL.md`](HISTORIAL.md) para el detalle bug por bug.

---

## Contribuir

¡PRs bienvenidos! Ver [`CONTRIBUTING.md`](CONTRIBUTING.md).
Por temas de seguridad, ver [`SECURITY.md`](SECURITY.md).

Para cambios grandes, abrí un issue primero.

---

## License

MIT — ver [`LICENSE`](LICENSE).
