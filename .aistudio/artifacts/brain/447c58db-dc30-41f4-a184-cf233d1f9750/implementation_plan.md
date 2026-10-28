# Gmail SMTP Integration for Unrestricted Verification Email Delivery

Configure Gmail SMTP using Google App Password credentials for `asokanmounesh@gmail.com` to enable real verification email delivery to any recipient worldwide without sandbox or domain verification restrictions.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters have been confirmed by the user and will be applied:

- **Confirmed Decision 1 (Provider Priority)**: Prioritize Gmail SMTP over the unverified Resend sandbox so that verification emails can be delivered to **any recipient email address** (staff members, administrators, personal inboxes).
- **Confirmed Decision 2 (Credentials Setup)**:
  - **SMTP Host**: `smtp.gmail.com`
  - **SMTP Port**: `465` (Secure SSL) or `587` (STARTTLS)
  - **SMTP User**: `asokanmounesh@gmail.com`
  - **SMTP Password**: App password provided (`akrgdspktzjezxwl`)
  - **SMTP From**: `CalibTrack Laboratory <asokanmounesh@gmail.com>`
- **Confirmed Decision 3 (Fail-Safe Verification)**: Run a live SMTP handshake test during startup to verify authentication with Google mail servers before accepting traffic.

---

### 1. Overview & Core Concept

Previously, the application attempted to dispatch verification emails via Resend. Because Resend was operating in a free sandbox without a verified custom domain, it restricted email sending solely to the registered account owner and returned `403` for all other recipient addresses.

By switching to **Gmail SMTP (Option 2)**:
1. Real emails will be sent directly through Google's mail servers using TLS/SSL.
2. Any staff email address entered during registration (Gmail, Outlook, Yahoo, institutional, corporate) will receive the 6-digit verification code directly in their inbox.
3. No domain DNS records (DKIM/SPF) are required.

---

### 2. User Experience & Visual Design

- **Registration Flow**:
  - A user fills out the staff registration form with any valid email address (e.g. `asokanmounesh@gmail.com`, `user@example.com`).
  - CalibTrack connects to `smtp.gmail.com` and delivers the ISO 17025 branded verification email.
  - The verification modal opens on-screen, prompting for the 6-digit code.
  - The email arrives in the user's real inbox with the subject: `<CODE> is your CalibTrack staff registration code`.
  - The user enters the code and activates their account.
- **Password Recovery Flow**:
  - The user requests a password reset code.
  - Gmail SMTP delivers the recovery code to their inbox.

---

### 3. Technical Architecture & Modifications

```
┌────────────────────────────────────────────────────────┐
│                   Frontend UI                          │
│  - LoginPage.tsx / OtpVerificationModal.tsx            │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/auth/register
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Express API                          │
│  - server/routes/auth.routes.ts                        │
│    └── Invokes emailService.sendVerificationEmail()    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼ (Priority: Gmail SMTP)
┌────────────────────────────────────────────────────────┐
│               Gmail SMTP (smtp.gmail.com)              │
│  - Port 465 (SSL) / 587 (TLS)                          │
│  - User: asokanmounesh@gmail.com                       │
│  - App Password Authentication                         │
│  - Direct delivery to ANY recipient inbox              │
└────────────────────────────────────────────────────────┘
```

#### Proposed Changes
1. **`.env` Configuration**:
   - Set `SMTP_HOST="smtp.gmail.com"`
   - Set `SMTP_PORT=465` (or `587`)
   - Set `SMTP_SECURE="true"`
   - Set `SMTP_USER="asokanmounesh@gmail.com"`
   - Set `SMTP_PASS="akrgdspktzjezxwl"`
   - Set `SMTP_FROM="CalibTrack Laboratory <asokanmounesh@gmail.com>"`
2. **`server/services/email.service.ts`**:
   - Update dispatch priority: if `SMTP_HOST` is configured with credentials (like Gmail), prioritize SMTP delivery so all recipients receive emails.
   - Retain Resend as an optional secondary fallback.
3. **`.env.example`**:
   - Update examples showing Gmail SMTP setup with App Passwords.

---

### 4. Verification Plan
- Run a live automated SMTP test sending a verification email to `asokanmounesh@gmail.com`.
- Confirm response status `200` with message ID from Google mail servers.
- Test registration endpoint `/api/auth/register` with `asokanmounesh@gmail.com`.
- Run `npm run test:e2e`, `lint_applet`, and `compile_applet`.
