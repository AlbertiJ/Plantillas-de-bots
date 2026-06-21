# ============================================
# INSTALL.bat — Plantillas de bots
# ============================================
# Ejecutar con doble click desde el Explorador de Windows
# O desde PowerShell: .\install.bat
# ============================================

@echo off
setlocal

cd /d "%~dp0"

echo ============================================
echo  Plantillas de bots - Instalacion
echo ============================================
echo.

REM --- Detectar Python 3.12 ---
where py >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta en PATH.
    echo Instala Python 3.12 desde https://python.org/downloads/
    pause
    exit /b 1
)

REM --- Borrar .venv previo si esta corrupto ---
if exist .venv (
    echo [INFO] Encontrado .venv previo. Lo borro y recreo limpio.
    rmdir /s /q .venv
)

REM --- Crear venv con Python 3.12 ---
echo [1/4] Creando venv con Python 3.12...
py -3.12 -m venv .venv
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudo crear el venv con Python 3.12.
    echo.
    echo Si py -3.12 no funciona, proba:
    echo   1. py -0          (lista las versiones disponibles)
    echo   2. Reinstala Python 3.12 desde python.org
    echo.
    pause
    exit /b 1
)

REM --- Activar e instalar ---
echo [2/4] Activando venv...
call .venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] No se pudo activar el venv.
    pause
    exit /b 1
)

echo [3/4] Instalando dependencias (esto puede tardar 2-3 min)...
python -m pip install --upgrade pip >nul 2>nul
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Fallo la instalacion.
    echo.
    echo Posibles causas:
    echo   - Sin conexion a internet
    echo   - Python 3.12 no tiene permisos para escribir
    echo   - Antivirus bloqueando pip
    echo.
    pause
    exit /b 1
)

echo.
echo [4/4] Verificando instalacion...
python -c "import fastapi, jinja2, pydantic, passlib, psutil; print('OK - todas las deps')"
if %errorlevel% neq 0 (
    echo [ADVERTENCIA] Alguna dependencia fallo.
)

echo.
echo ============================================
echo  INSTALACION COMPLETA
echo ============================================
echo.
echo Para arrancar el server:
echo   run.bat
echo.
echo La clave de admin aparecera en la consola al primer arranque.
echo Pegala en http://localhost:8000/login
echo.
pause