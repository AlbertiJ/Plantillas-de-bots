@echo off
echo ================================
echo  Plantillas de Bots en Python
echo  Setup automatico (Windows)
echo ================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js no esta instalado.
    echo Descargalo desde https://nodejs.org/ e intentalo de nuevo.
    pause
    exit /b 1
)

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo Instalando pnpm...
    npm install -g pnpm
)

echo Instalando dependencias...
pnpm install

echo.
echo Iniciando la aplicacion...
echo Abri tu navegador en http://localhost:5173
echo.
pnpm --filter @workspace/bot-templates run dev
pause
