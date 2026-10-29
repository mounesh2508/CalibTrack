# Vercel Deployment Email Delivery Resolution Plan

Diagnose and resolve why emails were not delivered in Vercel serverless deployments, fix the asynchronous event-loop freeze in serverless functions, ensure real-time email dispatch on new alerts, and add a live diagnostic email trigger.

---

### Root Cause Analysis: Why No Email Was Sent on Vercel

> [!IMPORTANT]
> A live diagnostic test confirmed that your Gmail SMTP credentials (`asokanmounesh@gmail.com` + App Password) are **100% valid** (Message ID `<63c141aa-e69c-b033-13e7-4a74ed302a0b@gmail.com>` delivered successfully).
> 
> However, on Vercel serverless deployments, emails were not arriving due to three specific issues:

1. **Un-Awaited Floating Promises in Vercel Serverless Functions**:
   - In `server/routes/users.routes.ts` and `server/services/reminder.service.ts`, email calls were invoked as floating background promises without `await`:
     ```typescript
     emailService.sendStaffWelcomeEmail(...).catch(...); // NOT AWAITED
     return res.status(201).json(...);
     ```
   - **How Vercel Works**: The moment a serverless function executes `res.json(...)`, Vercel **immediately freezes and terminates the container execution environment**. Any un-awaited background network sockets (like nodemailer connecting to Gmail SMTP) are instantly terminated before the TCP handshake completes.
   - **Fix**: Every email dispatch (`sendAlertEmail`, `sendStaffWelcomeEmail`) must be strictly `await`ed before sending the HTTP response.

2. **Alerts Were Only Generating In-App Cards, Not Transmitting Emails**:
   - When instruments were added or viewed in the app, `notificationService.syncLiveCalibrationAlerts()` formatted `email_details` for the in-app modal preview, but never actually invoked `emailService.sendAlertEmail()`.
   - Emails were only tied to `POST /api/reminders/trigger`.
   - **Fix**: When `syncLiveCalibrationAlerts()` detects a new or updated `CALIBRATION_OVERDUE` or `CALIBRATION_DUE_SOON` instrument, actively invoke and await `emailService.sendAlertEmail()` to send an email to all registered staff and the admin.

3. **Lack of a Direct Email Diagnostic Tool in the UI**:
   - Admins had no way to verify live SMTP delivery directly from the browser without waiting for an automated cron cycle.
   - **Fix**: Add a dedicated `POST /api/reminders/test-email` route and a "Send Test Email to Me" button in the Settings panel that delivers an immediate confirmation email to `asokanmounesh@gmail.com` and displays the Gmail Message ID in the UI.

---

### 1. Proposed Modifications

```
┌────────────────────────────────────────────────────────┐
│             Action (Staff Register, Alert, Test)       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             Vercel Serverless Function                 │
│  - Gathers recipient list                              │
│  - AWAITS emailService.sendAlertEmail()                │
│    └── Connects to smtp.gmail.com:465 (SSL)            │
│    └── Waits for SMTP 250 OK Response from Google      │
│  - Only THEN sends HTTP JSON response to client        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            Google Mail Server Delivery                 │
│  - Delivered to asokanmounesh@gmail.com & staff inboxes│
└────────────────────────────────────────────────────────┘
```

#### Detailed Changes
1. **`server/routes/users.routes.ts`**:
   - `await emailService.sendStaffWelcomeEmail(...)` before returning HTTP 201 so the serverless container does not freeze prematurely.
2. **`server/services/reminder.service.ts`**:
   - In `evaluateAndDispatch()`, sequentially `await emailService.sendAlertEmail(...)` for each overdue/due soon equipment.
3. **`server/services/notification.service.ts`**:
   - In `syncLiveCalibrationAlerts()`, when a new alert is generated, `await emailService.sendAlertEmail(...)` to all staff.
4. **`server/routes/reminder.routes.ts`**:
   - Add `POST /api/reminders/test-email` that sends a live verification test email to `asokanmounesh@gmail.com` and returns `{ success: true, messageId: ... }`.
5. **`src/pages/SettingsPage.tsx`**:
   - Add a **"Send Test Metrology Email"** button next to the active SMTP Gateway badge so you can verify live delivery with one click.

---

### 2. Verification Plan
- **Verification Tests**:
  - Test `POST /api/reminders/test-email` and verify Gmail SMTP 250 OK delivery to `asokanmounesh@gmail.com`.
  - Test staff creation with awaited welcome email.
  - Test reminder trigger with awaited multi-recipient alert emails.
  - Run `npm run test:e2e`.
  - Run `lint_applet` and `compile_applet`.
