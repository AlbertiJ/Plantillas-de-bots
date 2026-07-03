# Contributing to plantillas-de-bots-v1

¡Gracias por tu interés en contribuir! 🛠️

## Formas de contribuir

- 🐛 **Reportar bugs** (issue)
- 💡 **Proponer features** (issue con etiqueta `enhancement`)
- 📖 **Mejorar docs** (PR directo)
- 🧪 **Agregar tests** (PR)
- 🐍 **Code review** (PR review)
- 🌐 **Traducir** README y docs (PR)
- 📣 **Difundir** (posts, videos, stars en GitHub)

## Setup local

```bash
# 1. Fork y clonar
git clone https://github.com/tu-usuario/Plantillas-de-bots.git
cd Plantillas-de-bots

# 2. Crear venv (Python 3.12)
python -m venv .venv
.venv\Scripts\activate              # Windows
source .venv/bin/activate          # Linux/Mac

# 3. Instalar deps
pip install -r requirements.txt
pip install pytest pytest-asyncio black ruff

# 4. Crear credenciales de prueba
echo "" > data/credentials/.gitkeep
echo "" > data/bots/.gitkeep

# 5. Correr tests
pytest tests/ --ignore=tests/test_e2e_playwright.py

# 6. Correr la app
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

## Workflow

1. **Fork** del repo
2. **Branch** con nombre descriptivo: `fix/login-typo`, `feature/discord-adapter`
3. **Commits** con mensajes claros (preferentemente conventional commits: `feat:`, `fix:`, `docs:`, `chore:`)
4. **Tests** deben pasar antes de hacer PR
5. **PR** contra `main` con descripción clara del cambio
6. **Review** — un mantenedor va a revisar antes de merge

## Convenciones de código

- **Python 3.12** estricto (verificado por `mypy`)
- **Type hints** en funciones públicas (PEP 484 / 561)
- **Black** con `--line-length=100`
- **Ruff** para lint
- **Tests** con `pytest`, uno o más tests por feature
- **Logs** con `structlog`, no `print()`
- **Commits** con conventional commits cuando se pueda

## Tests rápidos antes de PR

```bash
# Lint
.venv\Scripts\python.exe -m black --check --line-length=100 app/ tests/ main.py
.venv\Scripts\python.exe -m ruff check app/ tests/ main.py

# Types
.venv\Scripts\python.exe -m mypy app/

# Tests
.venv\Scripts\python.exe -m pytest tests/ --ignore=tests/test_e2e_playwright.py
```

## Reportar vulnerabilidades de seguridad

**No abrir issue público.** Email a [juan.alberti@gba.gob.ar](mailto:juan.alberti@gba.gob.ar)
con detalles. Ver [SECURITY.md](SECURITY.md).

## Licencia

Al contribuir, aceptás que tu código se distribuya bajo la [MIT License](LICENSE).
