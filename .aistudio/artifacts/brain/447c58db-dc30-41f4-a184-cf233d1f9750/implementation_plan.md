# Real-Time In-App Calibration Alerts for Due Soon and Overdue Equipment

Ensure calibration alerts for **Due Soon** and **Overdue** instruments are automatically evaluated, populated, and displayed in the in-app notification feed in real time on Vercel deployments without requiring manual reminder triggers.

---

### User Review & Root Cause Analysis

> [!IMPORTANT]
> The exact root causes preventing in-app notifications on Vercel deployments have been diagnosed:

- **Root Cause 1 (Notification Generation Was Passive / Manual Only)**:
  - Previously, `evaluateAndDispatch()` in `reminder.service.ts` was only called when someone manually submitted a `POST /api/reminders/trigger` request.
  - When the app loaded on Vercel, `GET /api/notifications` simply queried whatever static notifications were in storage, rather than evaluating the current date against each instrument's `next_calibration_date`.
  - **Fix**: Update `notificationService.list()` (and `GET /api/notifications`) to automatically evaluate all registered equipment in real-time. Any instrument whose calibration is overdue (past due date) or due soon ($\le 30$ days) will have an active, unread in-app alert automatically generated and synchronized in storage.
- **Root Cause 2 (ID Mismatch Filtering in Frontend)**:
  - In `src/App.tsx`, incoming notifications were filtered with `equipIds.has(n.equipmentId)`. On Vercel, when PostgreSQL or dynamic models generate UUIDs (or when seed notifications had string IDs like `eq-001`), notifications without an exact ID match were dropped.
  - **Fix**: Update `App.tsx` and `api.ts` to match notifications against registered equipment by **both Equipment ID AND Equipment Code** (`EQ-2024-XXX`).
- **Root Cause 3 (Database Persistence for Dynamic Notifications)**:
  - If a PostgreSQL pool is active on Vercel, ensure generated notifications are upserted into the `notifications` table so mark-as-read and persistence work seamlessly across serverless invocations.

---

### 1. Proposed Modifications

```
┌────────────────────────────────────────────────────────┐
│              User opens CalibTrack on Vercel           │
│  - App.tsx calls api.fetchNotifications()              │
└──────────────────────────┬─────────────────────────────┘
                           │ GET /api/notifications
                           ▼
┌────────────────────────────────────────────────────────┐
│           Vercel Serverless / Express API              │
│  - notificationController.getAll()                     │
│    └── notificationService.list()                      │
│        └── Synchronizes live Due Soon & Overdue alerts │
│            based on today's date                       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            Real-Time Evaluated Alerts                  │
│  - Overdue: EQ-2024-005, EQ-2024-009, EQ-2024-015...   │
│  - Due Soon: Instruments within 30-day window          │
│  - Full email details & urgency badges included        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                  In-App Notification Feed              │
│  - Bell icon badge shows live unread count             │
│  - Dropdown & /notifications page displays alerts      │
│  - "View Email" opens formatted ISO 17025 notice       │
└────────────────────────────────────────────────────────┘
```

#### Detailed Changes
1. **`server/services/notification.service.ts`**:
   - Add automated synchronization logic: upon `list()`, dynamically evaluate all equipment records against current date.
   - For every equipment with status `OVERDUE` or `DUE_SOON` (or with `next_calibration_date` overdue or within notice window), ensure an up-to-date alert notification exists with complete `email_details`.
   - Support both PostgreSQL database pool and in-memory fallback.
2. **`src/services/api.ts`**:
   - Ensure `equipmentCode` is extracted from either `n.equipment_code` or `n.email_details?.equipment_code`.
3. **`src/App.tsx`**:
   - Update filtering logic so notifications match valid equipment by either `n.equipmentId` OR `n.equipmentCode`.

---

### 2. Verification Plan
- **Verification Tests**:
  - Test `GET /api/notifications` and verify all overdue and due soon instruments appear in the response payload.
  - Test mark-as-read endpoint (`PATCH /api/notifications/:id/read`).
  - Run full test suite (`npm run test:e2e`).
  - Run `lint_applet` and `compile_applet`.
