# Email OTP Verification & Password Reset Implementation Plan

Implementation of 6-digit email verification code (OTP) for staff registration and forgot password recovery flows, featuring Gmail integration with in-app test preview support.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following architectural and security choices:
> - **Delivery Channel**: Google Gmail API integration paired with an interactive in-app test preview drawer so verification codes can be inspected and auto-filled directly in the preview environment.
> - **Registration Entry Points**: Both a dedicated "Register Staff" tab on the Sign-In page and an Admin Invitation / Staff Registration interface within the app settings.
> - **Code Format & Expiry**: 6-digit numeric OTP valid for 15 minutes with single-use invalidation, attempt limits, and 60-second resend cooldown.

---

## 1. Overview & User Flows

### Flow A: Staff Registration with Email OTP Verification
1. **Initiation**: User selects "Register Staff" on the login page (or Administrator creates a staff invite).
2. **Details Entry**: User inputs full name, email address, password, and confirmation password.
3. **Code Generation & Dispatch**:
   - Backend creates a pending unverified staff record.
   - Generates a crypto-secure 6-digit numeric OTP (e.g., `582910`) expiring in 15 minutes.
   - Dispatches email via Gmail service and emits the in-app preview notification.
4. **Interactive Verification Modal**:
   - User enters the 6-digit code with live digit formatting.
   - Live 15-minute expiration countdown timer and "Resend Code" (with 60-second cooldown).
   - In-app test preview badge displaying the active OTP with a 1-click "Auto-fill Code" option.
5. **Account Activation**:
   - Submitting the matching code verifies the email address and activates the account.
   - User is seamlessly logged in and directed to the lab dashboard (or returned to sign in with success feedback).

### Flow B: Forgot Password & Password Reset Flow
1. **Initiation**: User clicks "Forgot password?" on the Sign-In screen.
2. **Email Entry**: User enters their registered email address and clicks "Send Recovery Code".
3. **Verification Code Step**:
   - 6-digit OTP is generated and dispatched to the email.
   - User enters the 6-digit code.
   - Backend validates the OTP against the user's active reset token.
4. **Set New Password Step**:
   - Upon successful verification, the modal transitions smoothly to "Set New Password".
   - User enters new password (with minimum 8 characters requirement, strength meter, and visibility toggle) and confirms it.
5. **Completion**:
   - Backend updates the user password hash using secure cryptographic hashing (PBKDF2 / Bcrypt).
   - Clears the used OTP code.
   - User receives success confirmation and can immediately log in with the new credentials.

---

## 2. User Experience & Visual Design

- **Metrology Domain Aesthetics**: Follows clean clinical lab styling (clean white `#FFFFFF`, deep lab slate `#0F172A`, clinical blue `#2563EB`, emerald `#059669` for verified states).
- **OTP Input Component**:
  - 6 individual monospace input boxes with auto-focus advancing and backspace traversal.
  - Paste support (automatically splits 6-digit strings across all boxes).
  - Clear countdown clock (`14:59 remaining`) and resend button with circular countdown indicator.
- **In-App Test Preview Drawer / Banner**:
  - Dismissible floating notification or collapsible simulation banner showing:
    - *Recipient*: `staff@lab.com`
    - *Subject*: `Your CalibTrack Verification Code`
    - *Code*: `[ 4 8 2 0 1 9 ]` (with "Copy" and "Auto-Fill" buttons).
- **Forgot Password Step Transition**:
  - Step indicator: `1. Enter Email` → `2. Verify 6-Digit Code` → `3. Set New Password`.

---

## 3. Technical Architecture & Endpoints

### Frontend Components
- `src/components/auth/OtpVerificationModal.tsx`: Reusable 6-digit verification modal with timer, paste handling, in-app code preview, and resend trigger.
- `src/components/auth/ForgotPasswordModal.tsx`: 3-step password recovery modal (Email → Verify Code → New Password).
- `src/pages/LoginPage.tsx`: Updated with:
  - "Forgot Password?" trigger button below password input.
  - Integrated staff registration tab with OTP verification gate.
  - In-app preview banner showing test codes for instant testing.
- `src/pages/SettingsPage.tsx`: Staff registration / invite tab with direct OTP preview.

### Backend REST API Routes
Both FastAPI (`backend/app/routers/auth.py`) and Express (`server/routes/auth.routes.ts`) will support these synchronized endpoints:

1. **`POST /api/auth/register`**
   - Body: `{ name, email, password }`
   - Action: Creates unverified user, generates 6-digit OTP, stores hashed token with 15-min expiry.
   - Returns: `{ success: true, message, email, simulation: { otp_code, expires_at } }`

2. **`POST /api/auth/verify-code`**
   - Body: `{ email, code, type: 'REGISTRATION' | 'PASSWORD_RESET' }`
   - Action: Validates code match, checks expiration, single-use invalidation.
   - Returns: `{ success: true, verified: true, reset_token?: string }`

3. **`POST /api/auth/forgot-password`**
   - Body: `{ email }`
   - Action: Generates 6-digit OTP for existing active account.
   - Returns: `{ success: true, message, email, simulation: { otp_code, expires_at } }`

4. **`POST /api/auth/reset-password`**
   - Body: `{ email, code, new_password, reset_token }`
   - Action: Verifies code/token and updates password hash.
   - Returns: `{ success: true, message: "Password updated successfully" }`

5. **`POST /api/auth/resend-code`**
   - Body: `{ email, type }`
   - Action: Enforces 60-second rate limit, creates fresh 6-digit code.

---

## 4. Security & Validation Rules

- **Zero-Pill Restraint & Typography**: High-legibility tabular monospace (`font-mono tracking-widest text-xl`) for numeric codes.
- **Brute Force Protection**: Max 5 incorrect code attempts before code invalidation and requiring a new code request.
- **Single-Use Invalidation**: OTP is immediately cleared once successfully verified.
- **Timing & Expiration**: Codes strictly expire after 15 minutes (`created_at + 900s`).
- **No Plaintext Passwords**: Passwords hashed before database persistence.

---

## 5. Verification & Testing Plan

1. **Staff Registration Flow**:
   - Register a new staff user (`elena.lab@example.com`).
   - Check modal displays OTP input and in-app code preview.
   - Enter invalid code (e.g., `000000`) → verify error feedback is displayed.
   - Enter valid code from preview / email → verify account is verified and login succeeds.
2. **Forgot Password Flow**:
   - Click "Forgot password?" on sign-in screen.
   - Enter existing email address.
   - Verify 6-digit OTP step appears with the dispatched code.
   - Verify code and proceed to "Set New Password" form.
   - Submit new password and verify successful sign-in with the new password.
3. **Resend & Rate Limiting**:
   - Click "Resend Code" → verify 60s cooldown timer prevents spamming.
4. **Applet Compilation**:
   - Run `compile_applet` and `lint_applet` to confirm clean zero-error compilation.
