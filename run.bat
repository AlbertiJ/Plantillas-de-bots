@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo  Plantillas de bots - Servidor
echo ============================================
echo.

if not exist .venv\Scripts\activate.bat (
    echo [ERROR] No hay venv. Ejecuta install.bat primero.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

REM --- Crear .env si no existe ---
if not exist .env (
    copy .env.example .env >nul
    echo [INFO] .env creado desde .env.example
    echo.
)

echo.
echo Clave admin aparecera en consola al primer arranque.
echo Pegala en http://localhost:8000/login
echo.
echo Ctrl+C para detener.
echo.

python -m uvicorn main:app --host 127.0.0.1 --port 8000

pause