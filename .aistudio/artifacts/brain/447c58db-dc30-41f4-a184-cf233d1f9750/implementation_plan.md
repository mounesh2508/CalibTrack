# Removal of On-Screen Lab Mailbox Backup & Auto-Fill

Establish strict external email verification across CalibTrack staff registration and password recovery workflows by removing the on-screen lab mailbox backup card and auto-fill button, replacing them with standard email delivery guidance and spam folder hints.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions confirmed by the user in Phase 1 will govern this revision:

- **Confirmed Decision 1**: Completely remove the on-screen lab mailbox backup card, auto-fill button, and copy button from both the **Staff Registration Verification modal** (`OtpVerificationModal.tsx`) and the **Password Recovery modal** (`ForgotPasswordModal.tsx`).
- **Confirmed Decision 2**: Present a standard, clean metrology verification modal featuring 6-digit input boxes, a 15-minute countdown timer, a 60-second resend button with cooldown, and a clear delivery notice with spam/junk folder guidance.
- **Confirmed Decision 3 (Strict Email Security)**: Discontinue exposing raw OTP verification codes in the frontend API response payloads, ensuring codes are strictly delivered to the user's external email inbox via Resend or SMTP.

---

### 1. Overview & Core Concept

Currently, registration and password recovery modals display a "Lab Mailbox Backup" card containing the active 6-digit code and an "Auto-Fill" button. To establish a production-grade, secure verification flow where staff must authenticate using their real inbox:

1. **Strict Inbox Verification**: Users must open their real email account (Gmail, Outlook, lab domain) to retrieve the 6-digit verification code.
2. **Clean & Distraction-Free UI**: The verification modals will present only the essential 6-digit input fields, delivery recipient email, expiration countdown, resend button, and helpful delivery troubleshooting guidance (e.g., spam folder check).
3. **No Code Leakage**: API response payloads will cease transmitting `otp_code` in the JSON body, enforcing true end-to-end email channel verification.

---

### 2. User Experience & Visual Design

#### Cleaned Verification Flow
1. **Initiate Action**:
   - Staff registers or initiates password recovery.
   - Real email is dispatched to their email address via Resend API or SMTP.
2. **Verification View**:
   - Clean, professional modal header in deep metrology blue gradient (`from-blue-600 to-indigo-700`).
   - Notice banner: *"We sent a 6-digit verification code to `user@domain.com`. Please check your inbox and enter the code below."*
   - Helpful footnote: *"Tip: If you don't see the email within 1–2 minutes, please check your spam or junk folder."*
   - Six individual auto-advancing numeric input slots (`w-11 h-13`).
   - Expiration timer (`15:00`) and "Resend Code" button with 60-second cooldown.
   - Direct verification submission button ("Confirm & Activate" / "Verify & Continue").

---

### 3. Technical Architecture & Component Mapping

```
┌────────────────────────────────────────────────────────┐
│                   Frontend UI                          │
│                                                        │
│  OtpVerificationModal.tsx                              │
│   ├── [REMOVED] On-screen backup card & auto-fill      │
│   ├── [REMOVED] Copy code button                       │
│   └── [KEPT] 6-digit inputs, spam hint, resend button  │
│                                                        │
│  ForgotPasswordModal.tsx                               │
│   ├── [REMOVED] On-screen backup card in VERIFY_OTP    │
│   └── [KEPT] Standard OTP inputs & timer               │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/auth/verify-code
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Express API                          │
│  server/routes/auth.routes.ts                          │
│   ├── Sends real email via emailService                │
│   └── Omits raw otp_code from API JSON response        │
└────────────────────────────────────────────────────────┘
```

#### Proposed Changes
1. **`src/components/auth/OtpVerificationModal.tsx`**:
   - Remove `activePreviewCode`, `copiedCode`, `handleAutoFill`, `handleCopyCode`, and the backup card JSX block.
   - Add clean spam folder hint below the recipient email description.
2. **`src/components/auth/ForgotPasswordModal.tsx`**:
   - Remove `activePreviewCode`, `handleAutoFillOtp`, `handleCopyCode`, and the backup card JSX block in `step === 'VERIFY_OTP'`.
   - Add spam folder hint.
3. **`server/routes/auth.routes.ts`**:
   - Update `/register`, `/resend-code`, and `/forgot-password` to return status and recipient info without raw `otp_code` in the JSON response.
4. **`src/services/api.ts` & `src/pages/LoginPage.tsx`**:
   - Clean up any unused `simulationOtpCode` state variables.

---

### 4. Verification Plan
- **Verification Tests**:
  - Test registration flow via curl and verify no `otp_code` is returned in the API response.
  - Verify email dispatch via `emailService`.
  - Verify modal UI in browser to confirm zero backup card / auto-fill buttons appear.
  - Test manual 6-digit code entry and successful account activation.
  - Run `npm run test:e2e`, `lint_applet`, and `compile_applet`.
