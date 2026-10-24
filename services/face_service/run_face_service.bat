@echo off
title HRM Face Recognition Service (Port 5001)
echo ========================================================
echo        HRM Face Recognition & Attendance Engine
echo ========================================================
cd /d "%~dp0"

set "PY_CMD=python"
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    if exist "%LocalAppData%\Programs\Python\Python311\python.exe" (
        set "PY_CMD=%LocalAppData%\Programs\Python\Python311\python.exe"
    ) else (
        echo [ERROR] Python is not found in PATH!
        echo Please restart your terminal or install Python 3.9+ from https://www.python.org/
        pause
        exit /b 1
    )
)

echo [2/3] Verifying dependencies...
"%PY_CMD%" -m pip install -r requirements.txt

echo [3/3] Downloading face detection & recognition models...
"%PY_CMD%" download_models.py

echo Starting Face Engine Microservice on port 5001...
"%PY_CMD%" face_engine.py
pause
exit /b 0
