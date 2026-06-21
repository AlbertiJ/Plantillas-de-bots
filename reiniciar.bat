@echo off
taskkill /F /IM python.exe /T 2>nul
timeout /t 2 /nobreak >nul
cd /d "%~dp0"
.venv\Scripts\activate
python -m uvicorn main:app --host 127.0.0.1 --port 8000
