# Vercel Deployment: Calibrated Status Sync & Persistence Plan

Ensure that after logging a calibration on Vercel deployments, the equipment status immediately updates from `OVERDUE` or `DUE SOON` to `CALIBRATED` in the equipment list, and remains persisted across page refreshes and serverless invocations.

---

### User Review & Critical Context

> [!IMPORTANT]
> **Root Cause Analysis on Vercel Deployment**:
> 1. **Serverless Ephemeral Memory Overwrites**: On Vercel serverless deployments without a dedicated persistent database (or across separate lambda microVMs), `POST /api/calibration-records` updates one serverless container instance, while the subsequent `GET /api/equipment` hits a different serverless instance that re-seeds default uncalibrated equipment.
> 2. **Client Cache Reconciliation Block**: In `src/services/api.ts` (`fetchEquipment()`), local cached equipment in `localStorage` was only merged for *new* equipment codes (`!knownCodes.has(...)`). It discarded local calibration updates for existing assets when the backend returned the default list.
> 3. **Database Update Matching**: In `server/services/equipment.service.ts`, the database `UPDATE` query matched `WHERE id = ?`. If an equipment item was accessed by its code (e.g. `EQ-2024-002`) rather than internal ID, database rows were not updated.
> 4. **Missing LocalStorage Persistence in Handlers**: In `src/App.tsx`, `handleAddCalibrationRecord` updated React memory state but did not persist the updated equipment to `localStorage.setItem('calibtrack_local_equipment', ...)`, causing fresh API fetches to revert the status.

---

### Proposed Architecture & Flow

```
┌────────────────────────────────────────────────────────┐
│                   Technician / Admin                   │
│   - Submits Calibration: Date, Outcome, Certificate    │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│             Calibration Dispatch & Persistence         │
│  - POST /api/calibration-records                       │
│  - Backend: Updates equipment row (DB & memory)        │
│    WHERE id = ? OR equipment_code = ?                  │
│  - Sets status = 'CALIBRATED', next_calibration_date   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│         Frontend Reconciliation & Resilient Cache      │
│  - handleAddCalibrationRecord updates equipment list   │
│  - Synchronizes to localStorage: 'calibtrack_..._eq'   │
│  - api.fetchEquipment merges latest calibration dates  │
│    even if serverless instance has cold-started        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                  Equipment List View                   │
│  - Badge instantly flips to green: 'CALIBRATED'        │
│  - Next calibration date scheduled in future           │
│  - Overdue / Due Soon count decrements by 1            │
└────────────────────────────────────────────────────────┘
```

---

### 1. Key Changes

#### A. Full Dual-Key Database Update (`server/services/equipment.service.ts`)
- Update `equipmentService.update` SQL statements to match `WHERE id = ? OR equipment_code = ?`.
- Ensure `last_calibration_date`, `next_calibration_date`, and `status = 'CALIBRATED'` are reliably written to PostgreSQL / MySQL when connected.
- In `reminderService.evaluateAndDispatch()`, if an active database pool exists, evaluate equipment from the live database rather than only the local memory array.

#### B. Resilient Client Cache Reconciliation (`src/services/api.ts`)
- In `api.fetchEquipment()`:
  - When merging from `localStorage` (`calibtrack_local_equipment`), do not simply discard matching equipment codes.
  - If a local record has a more recent `lastCalibrationDate` or explicit `CALIBRATED` status following a user action, preserve and apply the updated calibration metrics.
- In `api.updateEquipment()` and `api.createCalibrationRecord()`:
  - Automatically sync the returned `updatedEquipment` to `localStorage` immediately upon API response.

#### C. State Synchronization & Persistence (`src/App.tsx` & `src/pages/CalibrationPage.tsx`)
- In `src/App.tsx` (`handleAddCalibrationRecord` & `handleQuickCalibrateSubmit`):
  - Save the updated equipment list directly to `localStorage.setItem('calibtrack_local_equipment', ...)` so subsequent background fetches (`loadBackendData`) never wipe out the calibrated state.
  - In `loadBackendData()`, compare incoming backend items with local calibration updates so cold serverless responses never downgrade a calibrated asset back to `OVERDUE` or `DUE_SOON`.
- In `src/pages/CalibrationPage.tsx`:
  - When logging a calibration, pass the updated equipment returned by the API back to `onAddCalibrationRecord`.

---

### 2. Verification Plan

- **Calibration State Flip**:
  - Select an overdue equipment (e.g. `EQ-2024-002` or `EQ-2024-009`).
  - Log a calibration with outcome `Passed`.
  - Verify that the status in the Equipment List immediately updates to **CALIBRATED** with a green badge and future due date.
- **Persistence Across Refresh**:
  - Refresh the browser page / re-fetch equipment list.
  - Confirm the equipment remains **CALIBRATED** and does not revert to `OVERDUE` or `DUE_SOON`.
- **E2E & Build Tests**:
  - Run `npm run test:e2e` to verify all metrology workflows pass.
  - Run `tsc --noEmit` and `npm run build`.
