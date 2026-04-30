@echo off
chcp 65001 >nul 2>&1
:: ╔══════════════════════════════════════════════════════════╗
:: ║  Plantillas de Bots — Setup automático (Windows)         ║
:: ║  Ejecutar UNA SOLA VEZ. Para reinicios usar: start.bat   ║
:: ╚══════════════════════════════════════════════════════════╝

set API_PORT=3001
set WEB_PORT=5173

echo.
echo  =============================================
echo   Plantillas de Bots en Python
echo   Setup inicial - Windows
echo  =============================================
echo.

:: Verificar Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js no esta instalado.
    echo  Descargalo desde https://nodejs.org/ (v20 o superior^)
    pause & exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo  OK Node.js %%v

:: Verificar / instalar pnpm
where pnpm >nul 2>&1
if errorlevel 1 (
    echo  Instalando pnpm...
    npm install -g pnpm
)
for /f "tokens=*" %%v in ('pnpm --version') do echo  OK pnpm %%v

:: Verificar Python
where python >nul 2>&1
if errorlevel 1 (
    echo  AVISO: Python no encontrado. Los bots Python no podran ejecutarse.
    echo  Descargalo desde https://python.org/ ^(v3.11 o superior^)
    set PYTHON_OK=0
) else (
    for /f "tokens=*" %%v in ('python --version') do echo  OK %%v
    set PYTHON_OK=1
)

echo.
echo  Instalando dependencias del panel web...
call pnpm install

if "%PYTHON_OK%"=="1" (
    echo  Instalando dependencias de los bots Python...
    python -m pip install -r bots\requirements.txt -q
)

echo.
echo  Iniciando servidor API en puerto %API_PORT%...
echo  (Se abre en una ventana separada - no la cierres)
start "API Plantillas de Bots" cmd /c "set PORT=%API_PORT% && pnpm --filter @workspace/api-server run dev"

echo  Esperando que la API arranque (30s)...
timeout /t 30 /nobreak >nul

echo  Iniciando panel web en puerto %WEB_PORT%...
echo  (Se abre en una ventana separada - no la cierres)
start "Web Plantillas de Bots" cmd /c "set VITE_API_URL=http://localhost:%API_PORT% && set PORT=%WEB_PORT% && pnpm --filter @workspace/bot-templates run dev"

timeout /t 5 /nobreak >nul

echo.
echo  =============================================
echo   Servicios iniciados
echo  =============================================
echo.
echo   Panel web:  http://localhost:%WEB_PORT%
echo   API:        http://localhost:%API_PORT%
echo.
echo   Primer login:
echo     Usuario:    admin
echo     Contrasena: (visible en la pantalla de login del panel)
echo.
echo   Cambia la contrasena desde /admin al primer acceso.
echo.
echo   Para reiniciar sin reinstalar: start.bat
echo  =============================================
echo.
pause
