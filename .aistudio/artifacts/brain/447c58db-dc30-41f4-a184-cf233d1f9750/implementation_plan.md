# Direct Admin Staff Registration & Multi-Recipient Calibration Email Dispatch

Ensure administrators can directly register new laboratory staff members with immediate database persistence and live UI updates in the staff registry, and ensure dispatched calibration alert emails reach all staff members registered by the admin via Gmail SMTP.

---

### User Review & Root Cause Analysis

> [!IMPORTANT]
> The exact root causes behind the two reported issues have been identified:

1. **Staff Registration in Admin Account Was Blocked / Not Displayed**:
   - **Root Cause**: In `SettingsPage.tsx`, registering staff routed through `api.register()` which required entering the staff member's personal 6-digit OTP in an on-screen modal before adding them to the user list. If the admin didn't have the employee's code, the user remained trapped in `memoryStore.otps` and was never inserted into `users`.
   - **Root Cause 2**: `server/routes/users.routes.ts` lacked a dedicated `POST /api/users` endpoint. In addition, `GET /api/users` only read from in-memory objects rather than querying the persistent database.
   - **Fix**:
     - Implement `POST /api/users` (Admin Staff Creation): Creates staff immediately with status `ACTIVE` and `is_email_verified = true` in both PostgreSQL and memoryStore.
     - Automatically dispatch an ISO 17025 Welcome & Account Created notification to the new employee's email via Gmail SMTP.
     - Update `SettingsPage.tsx` so adding staff directly saves and immediately updates the **Registered Staff Members** list in the UI without requiring an OTP prompt from the administrator.
     - Implement `DELETE /api/users/:id` to allow removing staff.

2. **Dispatched Alerts Did Not Actually Send Real Emails to All Registered Staff**:
   - **Root Cause**: `evaluateAndDispatch()` in `reminder.service.ts` only logged `[CalibTrack Reminder] Gmail alert dispatched...` to the console and saved details to the in-app notification feed, but never actually invoked `nodemailer` / `emailService` to transmit real emails over the internet!
   - **Root Cause 2**: Recipient gathering only inspected memory defaults and fell back to dummy addresses (`sarah.lin@calibtrack.lab`) instead of querying all registered staff emails from the database.
   - **Fix**:
     - Implement `sendAlertEmail()` in `emailService` using our verified Gmail SMTP transporter (`smtp.gmail.com:465` with `587` fallback).
     - In `reminderService.gatherRecipients()`, dynamically query all registered staff emails (admins and technicians from both database and memory store).
     - In `reminderService.evaluateAndDispatch()`, actively transmit the ISO 17025 calibration alert email to all registered staff email addresses.

---

### 1. Proposed Modifications

```
┌────────────────────────────────────────────────────────┐
│                   Admin Settings UI                    │
│  - Adds new staff: Name, Email, Password, Role         │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/users
                           ▼
┌────────────────────────────────────────────────────────┐
│         Backend Staff Registration Engine              │
│  - Persists new user to DB & memory store              │
│  - Sends Welcome & Account Credentials Email           │
│  - Returns new staff member to UI                      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│              Live Staff List Updates                   │
│  - Immediately displayed in Registered Staff Members   │
│  - Role toggle (Admin <-> Technician) functional       │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│       Calibration Alert & Reminder Dispatcher          │
│  - Gathers ALL registered staff emails from registry   │
│  - Transmits real email via Gmail SMTP (port 465/587)  │
│  - Reaches every staff member registered by the admin  │
└────────────────────────────────────────────────────────┘
```

#### Detailed Changes
1. **`server/routes/users.routes.ts`**:
   - Add `POST /api/users`: Creates a staff member directly, stores password hash, adds to DB and memory store, and sends a welcome email.
   - Add `DELETE /api/users/:id`: Allows admins to remove staff accounts.
   - Update `GET /api/users`: Queries PostgreSQL when connected with memoryStore fallback.
2. **`server/services/email.service.ts`**:
   - Add `sendAlertEmail(payload)`: Transmits rich HTML calibration alerts to multi-recipient lists via Gmail SMTP.
   - Add `sendStaffWelcomeEmail(payload)`: Transmits account creation notice with credentials.
3. **`server/services/reminder.service.ts`**:
   - In `gatherRecipients()`: Dynamically pull all active staff emails from database and memory store.
   - In `evaluateAndDispatch()`: Actively dispatch emails via `emailService.sendAlertEmail()`.
4. **`src/services/api.ts`**:
   - Add `createUser(name, email, role, password)` and `deleteUser(id)`.
5. **`src/pages/SettingsPage.tsx`**:
   - Update `handleRegisterStaffSubmit` to call `api.createUser()`, display success notification, and immediately refresh the staff list.

---

### 2. Verification Plan
- **Verification Tests**:
  - Test `POST /api/users` with a new staff member (e.g. `mohanraja.ad24@bitsathy.ac.in`).
  - Verify that the staff member is returned in `GET /api/users`.
  - Trigger reminder dispatch via `POST /api/reminders/trigger` and verify real email transmission to all registered staff emails via Gmail SMTP.
  - Run `npm run test:e2e`.
  - Run `lint_applet` and `compile_applet`.
