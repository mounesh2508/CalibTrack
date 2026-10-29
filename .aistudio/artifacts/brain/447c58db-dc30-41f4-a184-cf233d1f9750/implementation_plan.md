# Instant In-App Notification Alerts When Adding Due Soon or Overdue Equipment

Ensure that registering or updating an instrument whose calibration deadline is **Due Soon** ($\le 30$ days) or **Overdue** immediately triggers and displays an in-app calibration alert in the notification center and bell dropdown.

---

### User Review & Root Cause Analysis

> [!IMPORTANT]
> The exact root causes preventing alerts when adding Due Soon or Overdue instruments have been diagnosed:

- **Root Cause 1 (`handleAddEquipment` in `src/App.tsx`)**:
  - When a user submitted the form in `AddEquipmentPage.tsx`, `handleAddEquipment` only added a generic `system` notification: *"New Equipment Registered: placed on schedule"*.
  - It did not evaluate `newEquip.status`. If the instrument was registered with past calibration dates making it **Overdue** or **Due Soon**, no urgent alert was created in the frontend notification state.
  - **Fix**: In `src/App.tsx`, evaluate `newEquip.status`. If `newEquip.status === 'Overdue'` or `newEquip.status === 'Due Soon'`, immediately generate the corresponding high-priority alert (`category: 'alert'` / `'reminder'`) with ISO 17025 metrology email details.
- **Root Cause 2 (`server/services/equipment.service.ts`)**:
  - In `equipmentService.create()` and `equipmentService.update()`, the backend computed `status = 'OVERDUE'` or `'DUE_SOON'`, but never triggered `notificationService.syncLiveCalibrationAlerts()`.
  - **Fix**: Automatically invoke `notificationService.syncLiveCalibrationAlerts()` inside `equipmentService.create()` and `equipmentService.update()` whenever a created or modified instrument is overdue or due soon.
- **Root Cause 3 (Notification Feed Synchronization in `AddEquipmentPage.tsx`)**:
  - Ensure that after equipment registration, `loadBackendData()` re-fetches notifications from `/api/notifications`, guaranteeing the bell icon badge and notification feed immediately reflect the new alert.

---

### 1. Proposed Modifications

```
┌────────────────────────────────────────────────────────┐
│             User Registers Instrument                  │
│  - Selects past last calibration date                  │
│  - Computed status: OVERDUE or DUE_SOON                │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/equipment
                           ▼
┌────────────────────────────────────────────────────────┐
│         equipmentService.create()                      │
│  - Detects status === 'OVERDUE' | 'DUE_SOON'           │
│  - Calls notificationService.syncLiveCalibrationAlerts │
│  - Inserts live alert into notifications store/DB      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│         App.tsx (handleAddEquipment)                   │
│  - Detects Overdue / Due Soon status                   │
│  - Optimistically prepends alert to notifications feed │
│  - Calls loadBackendData() to refresh /api/notifs      │
│  - Bell icon badge increments immediately              │
└────────────────────────────────────────────────────────┘
```

#### Detailed Changes
1. **`server/services/equipment.service.ts`**:
   - In `create()` and `update()`, if `status === 'OVERDUE' || status === 'DUE_SOON'`, invoke `notificationService.syncLiveCalibrationAlerts()`.
2. **`src/App.tsx`**:
   - In `handleAddEquipment()`, if `newEquip.status === 'Overdue'` or `'Due Soon'`, construct and prepend a `CALIBRATION_OVERDUE` or `CALIBRATION_DUE_SOON` notification alert with full email details.
   - In `handleUpdateEquipment()`, ensure notifications are refreshed from the backend.
3. **`src/pages/AddEquipmentPage.tsx`**:
   - Ensure the created equipment object passed to `onAddEquipment` retains the calculated `status` and `nextCalibrationDate`.

---

### 2. Verification Plan
- **Verification Tests**:
  - Create a new equipment with overdue last calibration date (e.g. 200 days ago with 180-day interval).
  - Verify that a `CALIBRATION_OVERDUE` alert appears immediately in `/api/notifications`.
  - Create a new equipment with due soon calibration date (e.g. 165 days ago with 180-day interval).
  - Verify that a `CALIBRATION_DUE_SOON` alert appears immediately.
  - Run `npm run test:e2e`.
  - Run `lint_applet` and `compile_applet`.
