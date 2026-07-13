@echo off
title Mentores Espirituais
echo.
echo A iniciar o backend (Python)...
start "Backend - Mentores Espirituais" cmd /k "cd /d "%~dp0backend" && .venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

echo A iniciar o frontend (React)...
start "Frontend - Mentores Espirituais" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo A aguardar que os servidores fiquem prontos...
timeout /t 6 /nobreak >nul

echo A abrir o site no browser...
start "" "http://localhost:5173"

exit
