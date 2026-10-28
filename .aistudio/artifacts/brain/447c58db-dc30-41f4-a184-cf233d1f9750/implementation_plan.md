# CalibTrack Real Email Delivery & Verification Code Backup System

Deliver real verification emails to registered staff inboxes using Resend API and standard SMTP, paired with an instant on-screen lab inbox backup and one-click OTP auto-fill to guarantee seamless onboarding across all deployment environments.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and delivery decisions have been confirmed and will be incorporated into the implementation:

- **Confirmed Decision (Delivery Strategy)**: Dual-layer delivery—real email dispatch to the user's actual email address, combined with an on-screen verification code backup with one-click auto-fill in the modal.
- **Confirmed Decision (Provider Support)**: Support both **Resend API** (via HTTPS REST API) and **Standard SMTP** (Nodemailer with host, port, user, pass) configurable through environment variables (`RESEND_API_KEY`, `SMTP_HOST`, `SMTP_USER`, etc.).
- **Zero-Failure Fallback**: If external mail credentials are not provided or if the remote email API is temporarily unreachable, registration never crashes or blocks—the code is safely delivered via the on-screen lab backup with clear user status indication.

---

### 1. Overview & Core Concept

When lab managers or technicians register new staff accounts on CalibTrack, verification is required before access is granted. Currently, codes were generated in-memory and logged to the server console without transmitting across external mail protocols.

This upgrade establishes:
1. **Real External Email Transmission**: Dispatches genuine HTML emails containing the 6-digit verification code directly to the registrant's inbox (e.g. Gmail, Outlook, lab domain) using either Resend or custom SMTP.
2. **On-Screen Verification Backup Banner**: An interactive metrology lab inbox card inside the verification modal displaying the active 6-digit code with **"One-Click Auto-Fill"** and **"Copy Code"** actions.
3. **Delivery Status Feedback**: Clear visual badges informing the user whether the email was dispatched to external mail servers or is running via sandbox mode.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Staff Registration**:
   - User inputs Name, Email, and Password on the registration screen and clicks "Register Staff Member".
   - Backend creates the user entry, generates a cryptographically sound 6-digit OTP, and triggers `emailService.sendVerificationOtp()`.
   - The user's external inbox receives an ISO 17025 styled email with the verification code.
   - The UI immediately transitions into the 6-digit verification modal.
2. **Verification & Auto-Fill**:
   - The modal shows the recipient address, countdown timer (15 minutes), and an on-screen verification backup card.
   - Users can either type the code received in their external email or click **"Auto-Fill Code"** directly on the on-screen card.
   - Upon entering the 6th digit, the account is automatically activated, transitioning the user straight into the system.
3. **Resend Code**:
   - Clicking "Resend Code" enforces a 60-second cooldown, dispatches a fresh email, and refreshes the backup card.

#### Visual Design Tokens & Component Styling
- **Modal Header**: Rich deep laboratory blue gradient (`from-blue-600 to-indigo-700`) with clean typography and ISO status badge.
- **On-Screen Backup Card**: Elegant amber/indigo card with border styling (`bg-slate-50 border-slate-200`), featuring a glowing 6-digit badge and quick auto-fill button.
- **HTML Email Design**: Responsive laboratory-themed template with CalibTrack header, bold verification code display (`32px` monospace font), expiration alert, and clean security notice.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Native REST Resend Client + SMTP Adapter**
  - *Chosen Approach*: Implement a zero-dependency lightweight HTTPS client for Resend API alongside Nodemailer for SMTP.
  - *Why*: Minimizes serverless bundle weight for Vercel, executes in under 200ms, and requires no heavy native C++ binaries.
  - *Alternatives Considered*: Heavy monolithic SDKs that increase cold-start latency on Vercel.

- **Decision 2: Non-Blocking Async Dispatch with Fail-Safe Fallback**
  - *Chosen Approach*: Send email asynchronously and always provide the active verification code in the API response.
  - *Why*: Prevents network timeouts from external mail servers from blocking user registration, ensuring users can always complete registration.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   Frontend UI                          │
│  - LoginPage.tsx (Registration & Login tabs)           │
│  - OtpVerificationModal.tsx (Inputs + Backup Banner)   │
│  - ForgotPasswordModal.tsx (Password reset codes)      │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/auth/register
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Express API                          │
│  - server/routes/auth.routes.ts                        │
│    ├── Generates 6-digit numeric OTP                   │
│    ├── Stores in-memory/DB with 15-min TTL             │
│    └── Invokes emailService.sendVerificationEmail()    │
└──────────────────────────┬─────────────────────────────┘
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌───────────────────────────────┐   ┌───────────────────────────────┐
│     Resend API (HTTPS REST)   │   │     Nodemailer (SMTP)         │
│  - RESEND_API_KEY             │   │  - SMTP_HOST, SMTP_PORT       │
│  - High-deliverability inbox  │   │  - SMTP_USER, SMTP_PASS       │
└───────────────────────────────┘   └───────────────────────────────┘
```

#### Files to Create & Update
1. **`server/services/email.service.ts`** *(New)*:
   - Configures email delivery via Resend API and standard SMTP.
   - Generates responsive ISO 17025 branded HTML templates for staff registration and password recovery.
   - Provides safe fallback reporting when external mail services are not configured.
2. **`server/routes/auth.routes.ts`**:
   - Hooks `emailService` into `/register`, `/resend-code`, and `/forgot-password`.
3. **`src/components/auth/OtpVerificationModal.tsx`**:
   - Adds the on-screen verification backup card with one-click auto-fill, copy button, and delivery status badge.
4. **`src/components/auth/ForgotPasswordModal.tsx`**:
   - Adds matching on-screen backup card for password reset codes.
5. **`.env.example`**:
   - Documents `RESEND_API_KEY`, `RESEND_FROM`, and `SMTP_*` parameters.

---

### 5. Verification Plan
- **Verification Tests**:
  - Run registration endpoint and verify email delivery pipeline logic.
  - Test OTP code input, auto-fill, and verification completion.
  - Run full end-to-end test suite (`npm run test:e2e`).
  - Run `lint_applet` and `compile_applet` to ensure zero compilation errors.
