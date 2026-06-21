# Pre-commit hooks

Este proyecto tiene dos formas de correr pre-commit checks:

## Opcion 1: pre-commit framework (recomendado para cross-platform)

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

Usa `.pre-commit-config.yaml` (black + ruff + standard hooks).
Funciona en Linux, macOS y Windows.

## Opcion 2: hook local de Windows (PowerShell)

Si estas en Windows y preferis un hook nativo:

```powershell
# Activar el hook (solo una vez por clone)
Copy-Item .githooks\pre-commit.ps1 .git\hooks\pre-commit.ps1
# Crear wrapper .ps1 que git puede invocar
# (git en Windows busca hooks sin extension por nombre)
```

El hook corre:
1. `black --check` sobre archivos staged
2. `ruff check` sobre archivos staged
3. `pytest` suite basica (excluye E2E y a11y que requieren browser)

Para saltar el hook en un commit especifico: `git commit --no-verify`
