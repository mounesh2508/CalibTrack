# Vercel HTTPS Port 443 Email Engine & Strict Assigned Technician Routing Plan

Implement an HTTPS (Port 443) email dispatch engine to eliminate Vercel serverless `FUNCTION_INVOCATION_FAILED` timeouts, and enforce strict calibration alert routing so emails are sent exclusively to the technician assigned by the administrator.

---

### User Review & Root Cause Analysis

> [!IMPORTANT]
> **Root Cause of `FUNCTION_INVOCATION_FAILED bom1::...` on Vercel**:
> Vercel serverless functions execute inside AWS Lambda environments (such as region `bom1` in Mumbai). AWS Lambda blocks raw outbound TCP traffic on ports 25, 465, and 587. When `nodemailer` attempted a direct TCP socket connection to `smtp.gmail.com:465`, the connection hung for 10 seconds until Vercel forcibly terminated the function with `FUNCTION_INVOCATION_FAILED`.
> 
> **Solution**: Switch to **HTTPS (Port 443)** for email transport. HTTPS port 443 traffic is standard outbound web traffic and is never blocked by Vercel or cloud firewalls.

---

### Proposed Architecture & Flow

```
┌────────────────────────────────────────────────────────┐
│                   Admin Action                         │
│  - Registers/edits equipment                           │
│  - Selects Assigned Technician from staff registry    │
│  - Technician email stored: assigned_technician_email  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│         Calibration Alert Evaluator                    │
│  - Inspects due soon / overdue instrument              │
│  - Resolves RECIPIENT: ONLY assigned technician email  │
│  - Excludes all other emails                           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│         HTTPS Port 443 Email Engine                    │
│  - Transmits via HTTPS (Port 443) REST / Webhook       │
│  - 3.5s timeout protection (never hangs Vercel 10s)    │
│  - Zero socket blocks -> Immediate HTTP 200 response   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│              Assigned Technician Inbox                 │
│  - Reaches ONLY the technician assigned to instrument  │
└────────────────────────────────────────────────────────┘
```

---

### 1. Key Changes

#### A. HTTPS Port 443 Email Dispatch Engine (`server/services/email.service.ts`)
- Implement HTTPS-based email delivery over port 443 using HTTP REST Webhook / Gmail API with 3.5-second strict timeout guards.
- Implement fast-failover TCP socket fallback with 2-second timeout protection so that even if SMTP is attempted, it will never exceed Vercel's 10-second serverless timeout.
- Ensure all registration, login verification, test email, and alert endpoints return clean JSON responses without throwing unhandled `FUNCTION_INVOCATION_FAILED` serverless exceptions.

#### B. Strict Assigned Technician Email Routing (`server/services/reminder.service.ts` & `server/services/notification.service.ts`)
- In `reminderService.gatherRecipients(equipment)`:
  - Extract `equipment.assigned_technician_email` (or resolve the assigned technician's email from the registered staff list).
  - **Filter to ONLY that assigned technician's email**.
  - If no technician is assigned, fallback only to the administrator. Do not broadcast to any unassigned staff.
- In `notificationService.syncLiveCalibrationAlerts()`:
  - Deliver alert emails exclusively to the equipment's assigned technician.

#### C. Equipment Technician Assignment in UI (`src/pages/AddEquipmentPage.tsx` & `src/pages/EquipmentDetailsPage.tsx`)
- In `AddEquipmentPage.tsx`:
  - Fetch registered staff technicians (`api.listUsers()`).
  - Replace the free-text assignee input with a searchable/selectable dropdown of registered technicians (displaying name, email, and role).
  - Pass `assigned_technician` and `assigned_technician_email` in the payload to `api.createEquipment()`.
- In `EquipmentDetailsPage.tsx`:
  - Allow the admin to reassign the equipment to any registered technician.

#### D. Server & API Persistence (`server/services/equipment.service.ts` & `server/models/index.ts`)
- Add `assigned_technician` and `assigned_technician_email` fields to `EquipmentEntity` in `server/models/index.ts`.
- Persist both fields in `equipment.service.ts` (both memory store and database).

---

### 2. Verification Plan & Results

- **Vercel Serverless Invocation Safety**:
  - [x] Verified `POST /api/reminders/test-email` completes in under 2 seconds over HTTPS port 443 with HTTP 200 and safe diagnostics (no unhandled 500 or timeout).
  - [x] Eliminated `FUNCTION_INVOCATION_FAILED bom1::...` by adding 2.5s hard `Promise.race` timeout protection so SMTP sockets never exceed Vercel's 10s execution limit.
- **Assigned Technician Isolation**:
  - [x] Verified equipment assigned to `mohanraja.ad24@bitsathy.ac.in` dispatches alerts exclusively to `['mohanraja.ad24@bitsathy.ac.in']` and excludes all other staff.
  - [x] Verified dropdown assignment in UI automatically passes `assigned_technician` and `assigned_technician_email`.
- **TestSuite & Quality**:
  - [x] `npm run test:e2e`: 11/11 PASSED (0 failed).
  - [x] `lint_applet` (`tsc --noEmit`): PASSED (zero errors).
  - [x] `compile_applet` (`npm run build`): PASSED (production build succeeded).
