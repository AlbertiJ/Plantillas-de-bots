# Plantillas-de-bots (Python port)

Rediseño en Python puro del proyecto `Plantillas-de-bots` original (Next.js + TypeScript).

**Stack:** FastAPI + Jinja2 + SQLite-less (JSON files).

**Basado en los commits:**
- `6cd96c7` — Bot Builder
- `01cefcf` — CTF OSINT + Librerías
- `233b2e8` — CTF Templates + Watchdog
- `b2c4265` — Status
- `6a89a62` — Login + Admin + .env tokens

**Idiomas:** solo español (se eliminó el sistema bilingüe original).

## Arranque

```bash
python -m venv .venv
source .venv/bin/activate        # Linux/Mac
# .venv\Scripts\activate         # Windows
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload
```

## Primer arranque

1. El servidor detecta que no hay credenciales
2. Genera una clave admin aleatoria y la muestra en consola
3. Vas a `http://localhost:8000/login`, ingresás la clave
4. Te obliga a cambiarla antes de entrar al panel
5. Listo — ya estás en `/admin`

## Reset de clave (si la olvidaste)

1. `POST /api/auth/reset` (o el botón en login)
2. El servidor borra `data/credentials/` completo
3. Genera una nueva clave aleatoria
4. La muestra en consola y la devuelve en la response

## Estructura

```
main.py                  # FastAPI app + lifespan + first-run
app/
  auth.py                # login / change / reset (con fix del bug)
  admin.py               # gestión de .env tokens
  launcher.py            # SSE subprocess streaming
  activity.py            # historial
  builder.py             # CRUD bots
  ctf_osint.py           # panel OSINT
  libraries.py           # gestión librerías
  ctf_templates.py       # templates CTF
  watchdog.py            # monitoreo
  status.py              # estado del sistema
templates/               # Jinja2
static/                  # CSS
data/                    # JSON files (ctf_templates, osint_bots, libraries, bots)
tests/                   # pytest
```
