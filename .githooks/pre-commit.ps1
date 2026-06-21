# Hook de pre-commit local para Windows
# Equivalente a .git/hooks/pre-commit pero commiteado
# Para activar: copiar este archivo a .git/hooks/pre-commit.ps1

$ErrorActionPreference = "Stop"

# Obtener archivos staged (solo los que se commitean)
$stagedFiles = git diff --cached --name-only --diff-filter=ACMR | Where-Object { $_ -match '\.(py|json|ya?ml|md)$' }

if (-not $stagedFiles) {
    Write-Host "No hay archivos staged para validar" -ForegroundColor Gray
    exit 0
}

Write-Host "Validando $($stagedFiles.Count) archivos staged..." -ForegroundColor Cyan

# 1. Verificar formato con black (solo archivos staged)
Write-Host "[1/3] black --check..." -ForegroundColor Yellow
.venv\Scripts\python.exe -m black --check --line-length=100 $stagedFiles 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "black FALLO. Aplicar formato:" -ForegroundColor Red
    Write-Host "  .venv\Scripts\python.exe -m black --line-length=100 $stagedFiles" -ForegroundColor Yellow
    exit 1
}

# 2. Verificar lint con ruff (solo archivos staged)
Write-Host "[2/3] ruff check..." -ForegroundColor Yellow
.venv\Scripts\python.exe -m ruff check $stagedFiles 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "ruff FALLO. Auto-fix:" -ForegroundColor Red
    Write-Host "  .venv\Scripts\python.exe -m ruff check --fix $stagedFiles" -ForegroundColor Yellow
    exit 1
}

# 3. Correr tests
Write-Host "[3/3] pytest..." -ForegroundColor Yellow
.venv\Scripts\python.exe -m pytest tests/ -q --ignore=tests/test_e2e_playwright.py --ignore=tests/test_accessibility.py 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "tests FALLARON. No se commitea." -ForegroundColor Red
    exit 1
}

Write-Host "Pre-commit checks OK ($($stagedFiles.Count) archivos)" -ForegroundColor Green
exit 0
