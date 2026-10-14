# CalibTrack — Windows Local Setup & Troubleshooting Guide

This guide ensures CalibTrack runs cleanly on Windows (`D:\CalibTack-S5\CalibTrack-New`) without `404 Not Found` authentication errors.

---

## The Root Cause of the 404 Error

When running only `npm run dev` in a single terminal on Windows:
1. `server.ts` tries to auto-spawn the backend using the command `python3`, which **does not exist** on Windows (Windows uses `py` or `python`).
2. As a result, the FastAPI service on port 8001 **never started**.
3. When you clicked **Sign In** or submitted **Register Staff**, the Express proxy could not reach `http://127.0.0.1:8001`.
4. In older versions of `server.ts`, failed proxy requests silently fell back to Vite, returning a confusing `HTTP Error 404 (Not Found)`.

---

## Solution 1: One-Click Startup (Recommended)

Simply double-click **`run_windows.bat`** in your project folder (`D:\CalibTack-S5\CalibTrack-New`), or run:
```cmd
run_windows.bat
```
This script automatically:
1. Opens a dedicated terminal running FastAPI with `py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload`.
2. Waits 3 seconds for database initialization.
3. Launches the frontend on `http://localhost:3000`.

---

## Solution 2: Manual Dual-Terminal Startup

### Terminal 1: Start FastAPI Backend
```cmd
cd D:\CalibTack-S5\CalibTrack-New
py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload
```
You should see:
```text
INFO:     Started server process
INFO:     Uvicorn running on http://127.0.0.1:8001 (Press CTRL+C to quit)
```

### Terminal 2: Start Frontend & Reverse Proxy
```cmd
cd D:\CalibTack-S5\CalibTrack-New
npm run dev
```
You should see:
```text
[CalibTrack] FastAPI backend is already active on http://127.0.0.1:8001.
[CalibTrack] Full-stack application ready at http://0.0.0.0:3000
```

---

## Required Files to Update Locally

Ensure the following 3 files in your local folder are updated with the latest changes:

1. **`server.ts`**:
   - Reconstructs request paths to preserve `/api`.
   - Cleans hop-by-hop headers (`connection`, `upgrade`, `keep-alive`, `transfer-encoding`).
   - Uses `py` on Windows for process auto-spawning.
   - Returns a clear `503 Service Unavailable` with command instructions if FastAPI is offline, instead of a 404.

2. **`backend/app/main.py`**:
   - Registers both `/health` and `/api/health`.
   - Mounts `auth.router` both with `prefix="/api"` and at root for total proxy resilience.

3. **`vite.config.ts`**:
   - Adds `proxy: { '/api': { target: 'http://127.0.0.1:8001', changeOrigin: true } }`.

---

## How to Register & Log In

1. Open `http://localhost:3000` in your browser.
2. Click the **Register Staff** tab.
3. Enter your Name, Email, and Password (minimum 8 characters).
4. Click **Register Staff**.
5. You will see a green banner with a **Development Simulation Preview**. Click **Verify Account Now →** (or open `/verify-email?token=...`).
6. Switch back to **Sign In** and log in with your email and password.
