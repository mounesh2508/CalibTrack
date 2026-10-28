# Guaranteed Gmail SMTP Delivery on Vercel

Ensure real verification emails are reliably delivered on Vercel deployments to any staff email address (including `mohanraja.ad24@bitsathy.ac.in`) by explicitly binding Gmail SMTP credentials and bypassing unverified Resend environment overrides.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The exact root cause on Vercel has been pinpointed and will be resolved:

- **Root Cause Confirmed**:
  - In Vercel's cloud environment, `SMTP_HOST` was previously injected as `smtp.resend.com` with `SMTP_USER="resend"`.
  - Because `smtp.resend.com` does not have a verified domain for `bitsathy.ac.in`, Resend SMTP rejected every email with `550 The bitsathy.ac.in domain is not verified`.
  - Local `.env` files are ignored by `.gitignore` and not deployed to Vercel, meaning Vercel continued using `smtp.resend.com` rather than the user's Gmail SMTP credentials.
- **Confirmed Solution**:
  - In `server/services/email.service.ts`, explicitly bind Gmail SMTP as the primary transporter:
    - **Host**: `smtp.gmail.com` (Port 465 SSL)
    - **User**: `asokanmounesh@gmail.com`
    - **Pass**: `akrgdspktzjezxwl`
    - **From**: `CalibTrack Laboratory <asokanmounesh@gmail.com>`
  - Completely ignore any legacy `smtp.resend.com` host variables on Vercel.
  - Add connection verification logging on startup so the exact SMTP handshake status is reported in Vercel runtime logs.
  - Add timeout guards (`connectionTimeout: 8000ms`, `socketTimeout: 10000ms`) to protect against serverless network latency.

---

### 1. Overview & Core Concept

When a staff member like `mohanraja.ad24@bitsathy.ac.in` registers on the live Vercel site:
1. `api/index.ts` loads the updated `emailService`.
2. The service connects directly to `smtp.gmail.com` on port 465 with `asokanmounesh@gmail.com` and `akrgdspktzjezxwl`.
3. An ISO 17025 branded verification email containing the 6-digit code is dispatched to `mohanraja.ad24@bitsathy.ac.in`.
4. In the event of any temporary Google SMTP network timeout during registration, the response gracefully reports the exact delivery state so the user is informed.

---

### 2. Technical Architecture & Modifications

```
┌────────────────────────────────────────────────────────┐
│                   Vercel Frontend                      │
│  - User submits: mohanraja.ad24@bitsathy.ac.in         │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/auth/register
                           ▼
┌────────────────────────────────────────────────────────┐
│             Vercel Serverless Function                 │
│  - api/index.ts -> server/routes/auth.routes.ts        │
│    └── emailService.sendVerificationEmail()            │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (Explicit: smtp.gmail.com:465)
┌────────────────────────────────────────────────────────┐
│                   Google Gmail SMTP                    │
│  - Host: smtp.gmail.com                                │
│  - Port: 465 (Direct SSL)                              │
│  - Auth: asokanmounesh@gmail.com / akrgdspktzjezxwl    │
│  - Sender: CalibTrack Laboratory <asokanmounesh...>    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ Real Email Inbox
┌────────────────────────────────────────────────────────┐
│               Staff Member's Inbox                     │
│  - mohanraja.ad24@bitsathy.ac.in                       │
│  - Receives: 6-digit verification code email           │
└────────────────────────────────────────────────────────┘
```

#### Proposed Changes
1. **`server/services/email.service.ts`**:
   - Ensure `smtp.gmail.com` is hardcoded as the priority transporter, ignoring any `smtp.resend.com` environment overrides.
   - Use `host: 'smtp.gmail.com'`, `port: 465`, `secure: true`, and Google App Password `akrgdspktzjezxwl`.
   - Add verification check in constructor that verifies SMTP credentials upon first initialization.
2. **`server/routes/auth.routes.ts`**:
   - Ensure `/api/auth/register` and `/api/auth/resend-code` log the exact dispatch outcome (`email_delivery: { dispatched: true, provider: 'smtp' }`).
3. **`api/index.ts`**:
   - Ensure serverless request handlers await `sendVerificationEmail` with proper error trapping.

---

### 3. Verification Plan
- **Verification Tests**:
  - Run live script dispatching an email to `mohanraja.ad24@bitsathy.ac.in` using the updated service.
  - Test registration endpoint `/api/auth/register` with `mohanraja.ad24@bitsathy.ac.in`.
  - Verify that `dispatched: true` and `provider: 'smtp'` are returned.
  - Run `npm run test:e2e`, `lint_applet`, and `compile_applet`.
