# CalibTrack — Local Windows 404 Resolution & Setup Blueprint

A targeted, step-by-step resolution to eliminate the `HTTP Error 404 (Not Found)` authentication error on Windows by synchronizing the local codebase, running the FastAPI backend alongside the React frontend in dual terminals, and verifying staff registration and login.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Based on your responses, the root cause is confirmed:
> 1. **Local Files Not Yet Synchronized**: Your local folder `D:\CalibTack-S5\CalibTrack-New` still has the older codebase where the proxy and dual-route registrations were not yet present.
> 2. **Single Terminal Running Only Frontend**: You are currently running only `npm run dev` in one terminal. On Windows, Node.js cannot auto-spawn `python3` (which does not exist on Windows). Consequently, the FastAPI backend on port 8001 is not running at all, causing Express to return 404 when auth requests cannot be forwarded.

- **Confirmed Decision 1**: Run the FastAPI backend and Express/Vite frontend in **two separate terminals** on Windows.
- **Confirmed Decision 2**: Synchronize the updated `server.ts`, `vite.config.ts`, and `backend/app/main.py` files to your local `D:\CalibTack-S5\CalibTrack-New` directory.
- **Confirmed Decision 3**: Register the first staff account via the **Register Staff** tab to initialize credentials in `calibtrack_dev.db` with simulated email verification.

---

## 1. Overview & Core Concept

- **What It Does**: Establishes a seamless, reliable connection between the React + TypeScript frontend running on `http://localhost:3000` and the Python FastAPI metrology backend running on `http://127.0.0.1:8001`.
- **Target Persona**: Lab Metrologists, Quality Control Technicians, and System Administrators running CalibTrack on local Windows development environments.
- **Key Value**: Eliminates the 404 Authentication Notice error, ensures seamless proxy forwarding of registration, email verification, and JWT login, and enables complete offline-capable testing with SQLite.

---

## 2. User Experience & Local Workflow

```
┌────────────────────────────────────────────────────────────────────────┐
│                        STEP-BY-STEP USER FLOW                          │
└────────────────────────────────────────────────────────────────────────┘

  Terminal 1 (Backend)                   Terminal 2 (Frontend)
  py -m uvicorn backend.app.main:app     npm run dev
  --host 127.0.0.1 --port 8001           (Starts server.ts on :3000)
         │                                      │
         ▼                                      ▼
  FastAPI Active on :8001                Express + Vite on :3000
         ▲                                      │
         │  Proxy Request (/api/auth/*)        │
         └──────────────────────────────────────┘
                         │
                         ▼
             Browser at http://localhost:3000
             1. Click "Register Staff"
             2. Enter Name, Email, Password
             3. Receive Simulation Link & Token
             4. Click "Verify Account Now"
             5. Sign In -> Full Dashboard Access
```

1. **Terminal 1 (FastAPI Service)**:
   - Starts FastAPI with Uvicorn on `127.0.0.1:8001`.
   - Auto-creates SQLite schema (`calibtrack_dev.db`) with `is_email_verified` and token fields.
2. **Terminal 2 (Frontend & Reverse Proxy)**:
   - Starts Express on `http://localhost:3000`.
   - Reverse proxies all `/api/*` traffic to `http://127.0.0.1:8001/api/*` without stripping prefixes or failing silently.
3. **Browser Interface**:
   - The user opens `http://localhost:3000`.
   - Clicking **Register Staff** sends `POST /api/auth/register`, which FastAPI receives and responds with `HTTP 201 Created` and a simulation verification token.
   - The user clicks the on-screen verification button or visits `/verify-email?token=...`.
   - The user logs in with their newly verified credentials and enters the metrology dashboard.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual-Terminal Launch on Windows**
  - *Chosen Approach*: Explicitly launch the FastAPI backend in Terminal 1 and `npm run dev` in Terminal 2.
  - *Why*: On Windows, Node.js background process management (`child_process.spawn`) often encounters permission barriers, console window hiding, and missing path aliases (`python3` vs `py`). Dedicated terminals allow immediate visibility into Python logs and Uvicorn stack traces.
  - *Alternatives Considered*: Single npm command with `concurrently`—rejected because Uvicorn interactive reload and Python venv activation can crash silently on Windows CMD/PowerShell.

- **Decision 2: Path-Preserving Resilient Proxy in `server.ts`**
  - *Chosen Approach*: Normalizing incoming paths so `/api` is never omitted, and returning `HTTP 503 Service Unavailable` with actionable instructions if FastAPI is offline, rather than silently falling through to Vite's 404.
  - *Why*: Prevents misleading 404 Not Found error banners and tells the user exactly which command to run if the backend service drops.

- **Decision 3: Dual Route Registration in FastAPI (`backend/app/main.py`)**
  - *Chosen Approach*: Mounting the router both at root and with `prefix="/api"`.
  - *Why*: Ensures total compatibility whether a developer accesses FastAPI directly, via Vite proxy, or through Express.

---

## 4. Technical Architecture & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CALIBTRACK SYSTEM TOPOLOGY                        │
└────────────────────────────────────────────────────────────────────────┘

  Browser Client (http://localhost:3000)
    │
    ├── [GET  /*]             ──> Vite Middleware (React SPA Pages)
    │
    └── [POST /api/auth/login] ──> Express Reverse Proxy (server.ts)
        [POST /api/auth/reg]        │
                                    │ (Forward with hop-by-hop headers stripped)
                                    ▼
                              FastAPI Service (http://127.0.0.1:8001)
                                    │
                                    ├── Auth Router (/api/auth/*)
                                    │     ├── Password Hashing (PBKDF2)
                                    │     ├── Single-use Token Generator
                                    │     └── JWT Access Token Signer
                                    │
                                    ▼
                              SQLite Database (calibtrack_dev.db)
                                  [users table: id, email, password_hash,
                                   is_email_verified, token, expires_at]
```

---

## 5. Step-by-Step Execution Plan

1. **Synchronize Local Codebase**:
   - Provide the exact file changes for `server.ts`, `vite.config.ts`, and `backend/app/main.py` so the local folder matches the validated repository.
2. **Launch Dual Terminals**:
   - **Terminal 1**: `py -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload`
   - **Terminal 2**: `npm run dev`
3. **Verify Connectivity**:
   - Test `http://127.0.0.1:8001/api/health` -> returns `{"status":"ok"}`.
   - Test `http://localhost:3000/api/health` -> returns `{"status":"ok"}`.
4. **Staff Registration & Verification Walkthrough**:
   - Register a staff user at `http://localhost:3000`.
   - Verify the account using the simulation link.
   - Sign in and verify access to equipment records and compliance scheduler.
