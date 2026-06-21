# ⚠️ Nota de entorno

Si usás **Python 3.14**, `pydantic-core 2.27` falla al compilar (PyO3 aún no tiene wheel para 3.14 estable).

## Workarounds

### Opción A — usar Python 3.12 (recomendado)
```bash
# Linux/Mac
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Windows (py launcher)
py -3.12 -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### Opción B — pydantic 2.10 con wheel precompilado (forzar ABI3)
```bash
# Solo Linux
PYO3_USE_ABI3_FORWARD_COMPATIBILITY=1 pip install pydantic==2.10.4
```

### Opción C — usar `pydantic` con versión que tenga wheel para 3.14
Esperar a `pydantic-core 2.28+` o usar Python 3.12/3.13 hasta que 3.14 esté estable.
