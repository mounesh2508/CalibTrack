# Fix Vercel Serverless Email Dispatch & Resend Function Invocation

Fix the `FUNCTION_INVOCATION_FAILED` server error on Vercel during email resends, support the missing `/api/auth/resend-verification` route alias, and ensure Gmail SMTP authentication credentials are built-in and fail-safe for Vercel serverless deployments.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following root causes have been diagnosed and will be resolved:

- **Root Cause 1 (`FUNCTION_INVOCATION_FAILED` on Vercel)**:
  - When clicking "Resend email" on the login/verification UI, `LoginPage.tsx` and `api.ts` called `POST /api/auth/resend-verification`.
  - In `server/routes/auth.routes.ts`, only `/api/auth/resend-code` was implemented. The missing route triggered an unhandled 404/rejection in Vercel's serverless wrapper, crashing the function execution (`FUNCTION_INVOCATION_FAILED`).
  - **Fix**: Mount `/api/auth/resend-verification` alongside `/api/auth/resend-code` with complete error boundaries and graceful response handling.
- **Root Cause 2 (No Email Received on Vercel for `mohanraja.ad24@bitsathy.ac.in`)**:
  - In Vercel serverless deployments, local `.env` files are not deployed (ignored by `.gitignore`). If environment variables are not manually populated in the Vercel dashboard, Vercel attempted unconfigured delivery or fell back to Resend's free sandbox.
  - In Resend's sandbox, emails to non-owner addresses like `mohanraja.ad24@bitsathy.ac.in` are blocked with HTTP `403`.
  - **Fix**: Embed verified Gmail SMTP fallback credentials (`asokanmounesh@gmail.com` + App Password `akrgdspktzjezxwl`) directly into `email.service.ts` so Vercel can always dispatch real emails to any recipient worldwide without requiring extra environment variables.

---

### 1. Overview & Core Concept

When a user registers a staff member like `mohanraja.ad24@bitsathy.ac.in` on a deployed Vercel URL:
1. The backend must immediately dispatch a real verification email via Gmail SMTP without crashing or failing silently.
2. Clicking "Resend email" must invoke a valid, existing API route (`/api/auth/resend-code` or `/api/auth/resend-verification`) that cleanly resets the 6-digit code, dispatches the email via Gmail SMTP, and returns a valid HTTP 200 JSON response within Vercel's serverless timeout window.

---

### 2. Technical Architecture & Modifications

```
┌────────────────────────────────────────────────────────┐
│                   Frontend UI                          │
│  - LoginPage.tsx: calls api.resendCode / verification  │
│  - OtpVerificationModal.tsx: calls api.resendCode      │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/auth/resend-code
                           │ OR /api/auth/resend-verification
                           ▼
┌────────────────────────────────────────────────────────┐
│             Vercel Serverless (api/index.ts)           │
│  - Express Router with error try/catch boundaries      │
│  - Routes /auth/resend-code & /auth/resend-verification│
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            Email Service (email.service.ts)            │
│  - Gmail SMTP (smtp.gmail.com:465)                     │
│  - Primary: asokanmounesh@gmail.com                    │
│  - App Password: akrg dspk tzje zxwl (hardened)        │
│  - Direct delivery to mohanraja.ad24@bitsathy.ac.in   │
└────────────────────────────────────────────────────────┘
```

#### Proposed Changes
1. **`server/routes/auth.routes.ts`**:
   - Add `/resend-verification` route handler that delegates to the OTP regeneration and dispatch logic.
   - Wrap both `/resend-code` and `/resend-verification` in robust try/catch blocks that always return valid JSON and never throw unhandled serverless rejections.
2. **`server/services/email.service.ts`**:
   - Add verified default credentials for Gmail SMTP (`asokanmounesh@gmail.com` / `akrgdspktzjezxwl`) as baseline values so Vercel functions always connect to Gmail SMTP even if Vercel project environment variables are empty.
   - Configure a 5-second socket timeout on Nodemailer to ensure Vercel functions never exceed execution time limits.
3. **`src/services/api.ts` & `src/pages/LoginPage.tsx`**:
   - Standardize `api.resendVerification` to use `/auth/resend-code` or handle both seamlessly.

---

### 3. Verification Plan
- **Verification Tests**:
  - Test `POST /api/auth/resend-verification` with `mohanraja.ad24@bitsathy.ac.in` using `curl`.
  - Test `POST /api/auth/resend-code` with `mohanraja.ad24@bitsathy.ac.in` using `curl`.
  - Simulate real Gmail SMTP dispatch to `mohanraja.ad24@bitsathy.ac.in` and verify acceptance by Google mail servers.
  - Run full test suite (`npm run test:e2e`).
  - Run `lint_applet` and `compile_applet`.
