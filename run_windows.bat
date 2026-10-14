@echo off
title CalibTrack Windows Launcher
echo ============================================================
echo   CalibTrack - Laboratory Calibration Management Portal
echo   Local Windows Launcher (FastAPI + React Vite Full-Stack)
echo ============================================================
echo.

:: Ensure we are running from project root
cd /d "%~dp0"

:: 1. Launch FastAPI Backend in a dedicated terminal window
echo [1/2] Launching FastAPI Backend on http://127.0.0.1:8001...
start "CalibTrack - FastAPI Backend (:8001)" cmd /k "py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload"

:: 2. Give the Python server a moment to initialize the database
echo Waiting for backend initialization...
timeout /t 3 /nobreak >nul

:: 3. Launch Frontend and Express Reverse Proxy
echo.
echo [2/2] Launching Frontend & Proxy on http://localhost:3000...
echo.
echo ============================================================
echo   Frontend Portal:        http://localhost:3000
echo   FastAPI Swagger Docs:   http://127.0.0.1:8001/docs
echo   FastAPI Health Check:   http://127.0.0.1:8001/api/health
echo ============================================================
echo.
npm run dev
