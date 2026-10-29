# Comprehensive Vercel Deployment Audit, Bug Fix & Optimization Plan

Audit the CalibTrack application for full production compatibility with Vercel Serverless Functions (`@vercel/node`), fix runtime bugs (including CORS `vary` header crashes in serverless containers), and verify all endpoints and email dispatch pathways without `.env` dependency.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following issues were diagnosed during the Vercel serverless runtime simulation and will be resolved:

- **Identified Bug 1 (CORS `vary` Header Crash in Serverless Environments)**:
  - During serverless execution simulation of `api/index.ts`, requests crashed with `TypeError: Cannot read properties of undefined (reading 'vary')` originating from the third-party `cors` package attempting to inspect response headers on Vercel's response wrapper.
  - **Fix**: Replace the third-party `cors` package with a lightweight, robust custom middleware that directly injects standard CORS headers (`Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`) and instantly resolves `OPTIONS` preflight requests with `204 No Content`.
- **Identified Bug 2 (Zero `.env` Dependency Verification)**:
  - The user deleted `/.env`. On Vercel, `.env` is never deployed (ignored by `.gitignore`).
  - **Fix**: Verify that all core services—especially Gmail SMTP (`asokanmounesh@gmail.com` with App Password `akrgdspktzjezxwl`), database memory fallback, and ISO 17025 interval calculations—operate seamlessly with zero reliance on local `.env` files.
- **Identified Bug 3 (Vercel Route Rewrite Normalization in `api/index.ts`)**:
  - Ensure URL query paths (`?path=...`) from `vercel.json` rewrites and direct `/api/...` paths are seamlessly resolved without query parameter pollution.

---

### 1. Proposed Modifications

```
┌────────────────────────────────────────────────────────┐
│                   Vercel Client                        │
│  - Static assets served via Vite build (/dist)         │
└──────────────────────────┬─────────────────────────────┘
                           │ All /api/* calls
                           ▼
┌────────────────────────────────────────────────────────┐
│             Vercel Serverless (api/index.ts)           │
│  - Custom Zero-Dependency CORS Header Injector         │
│    └── Replaces fragile `cors` package (No vary error) │
│  - Query/Path Normalizer for Vercel Rewrites           │
│  - Try/Catch Error Boundaries around All Routes        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Express Routes                       │
│  - /auth/register, /auth/login, /auth/verify-code      │
│  - /auth/resend-code, /auth/resend-verification        │
│  - /equipment, /calibrations, /notifications           │
│  - /dashboard/summary, /reminders/trigger              │
└────────────────────────────────────────────────────────┘
```

#### Detailed Changes
1. **`server/middleware/cors.ts`**:
   - Refactor from external `cors` package to a native, zero-dependency middleware that writes CORS headers directly to `res.setHeader`.
   - Properly handles `OPTIONS` preflight requests with immediate `204` status.
2. **`api/index.ts`**:
   - Harden `handler(req, res)` with enhanced response completion listeners (`finish`, `close`).
   - Add graceful 404 handler for unmatched routes returning clean JSON instead of crashing the serverless microVM.
3. **`server/services/email.service.ts`**:
   - Double-check default fallback values for Gmail SMTP so it operates cleanly in environments without `.env`.

---

### 2. Verification Plan

- **Automated Vercel Serverless Simulation**:
  - Run the multi-endpoint simulator against `api/index.ts` covering:
    - `GET /api/dashboard/summary`
    - `GET /api/equipment`
    - `GET /api/calibrations`
    - `GET /api/notifications`
    - `POST /api/reminders/trigger`
    - `POST /api/auth/register`
    - `POST /api/auth/resend-verification`
    - `POST /api/auth/resend-code`
  - Verify every endpoint returns status `200` or `201` without `vary` errors.
- **End-to-End Test Suite**:
  - Execute `npm run test:e2e` to verify full system health.
- **Build Verification**:
  - Run `npm run build` (`vite build`) to confirm static asset compilation.
  - Run `lint_applet` and `compile_applet`.
