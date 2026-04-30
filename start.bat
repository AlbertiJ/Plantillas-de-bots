@echo off
chcp 65001 >nul 2>&1
:: ╔══════════════════════════════════════════════════════════╗
:: ║  Plantillas de Bots — Reinicio rapido (Windows)          ║
:: ║  Usar DESPUES de haber ejecutado setup.bat por primera vez║
:: ╚══════════════════════════════════════════════════════════╝

set API_PORT=3001
set WEB_PORT=5173

echo.
echo  Plantillas de Bots - Inicio rapido
echo.

echo  Iniciando API en puerto %API_PORT%...
start "API Plantillas de Bots" cmd /c "set PORT=%API_PORT% && pnpm --filter @workspace/api-server run dev"
echo  Esperando 30 segundos que compile...
timeout /t 30 /nobreak >nul

echo  Iniciando panel web en puerto %WEB_PORT%...
start "Web Plantillas de Bots" cmd /c "set VITE_API_URL=http://localhost:%API_PORT% && set PORT=%WEB_PORT% && pnpm --filter @workspace/bot-templates run dev"
timeout /t 5 /nobreak >nul

echo.
echo  Servicios corriendo:
echo    Panel:  http://localhost:%WEB_PORT%
echo    API:    http://localhost:%API_PORT%
echo.
pause
