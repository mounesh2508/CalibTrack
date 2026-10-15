# Implementation Plan: Fix React Duplicate Keys & Update Administrator Credentials

Resolve the React runtime warning regarding duplicate/undefined keys across dashboard and list views, and apply the requested administrator account credentials (`asokanmounesh@gmail.com` / `a.MOUNESH14`) with display name `Mounesh A`.

## Root Cause Analysis (Duplicate Key Error)

- In `src/services/api.ts`, the dashboard summary maps `upcoming_calibrations` items to objects with keys `equipmentId`, `equipmentCode`, and `equipmentName`.
- When `DashboardPage.tsx` falls back to `mapBackendEquipmentToFrontend(u)` for upcoming items, `mapBackendEquipmentToFrontend` checks `item.id || item.equipment_code || item.code`. None of these three exist on `u` (which uses `equipmentId` / `equipmentCode`), evaluating to `undefined` and yielding `id: "undefined"`.
- When two or more upcoming calibration records are mapped, both receive `id: "undefined"`, causing `<tr key={eq.id}>` in `DashboardPage.tsx` to mount multiple children with the identical key `"undefined"`.
- Similar potential key collisions exist in `EquipmentListPage.tsx` (`categories` and `locations` arrays derived without filtering undefined/falsy values before mapping `<option key={c}>`) and unindexed keys across `Header.tsx`, `CalibrationPage.tsx`, and `NotificationsPage.tsx`.

## Proposed Changes

### 1. Fix React Key Uniqueness & API Normalizers

#### [src/services/api.ts]
- Update `mapBackendEquipmentToFrontend`:
  - Enhance ID resolution to support `item.id || item.equipmentId || item.equipment_id || item.equipmentCode || item.equipment_code || item.code || `EQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}``.
  - Ensure fallback code and name correctly resolve from camelCase properties (`equipmentCode`, `equipmentName`).
- Update dashboard summary normalizer:
  - Ensure each item in `upcomingCalibrations` and `recentCalibrationRecords` has a guaranteed unique `id` and `equipmentId`.

#### [src/pages/DashboardPage.tsx]
- In `upcomingEquipment` table row rendering:
  - Use resilient compound key: `key={eq.id ? `${eq.id}-${idx}` : `upcoming-${idx}`}`.
- In `recentActivitiesList` mapping and rendering:
  - Use compound key: `key={act.id ? `${act.id}-${idx}` : `act-${idx}`}`.

#### [src/pages/EquipmentListPage.tsx]
- In `categories` and `locations` useMemo:
  - Filter out undefined/falsy values before constructing sets: `.map((e) => e.category).filter(Boolean)`.
  - Provide distinct keys for option items: `<option key={`cat-${c || idx}`} value={c}>`.
  - In table row mapping, use `key={eq.id ? `${eq.id}-${idx}` : `eq-${idx}`}`.

#### [src/components/layout/Header.tsx] & [src/pages/NotificationsPage.tsx]
- Guard notification and search result loops with fallback indices:
  - `key={n.id ? `${n.id}-${idx}` : `notif-${idx}`}`.
  - `key={eq.id ? `${eq.id}-${idx}` : `search-${idx}`}`.

#### [src/pages/CalibrationPage.tsx] & [src/pages/CalendarPage.tsx]
- Guard table rows and select options:
  - `key={rec.id ? `${rec.id}-${idx}` : `rec-${idx}`}`.
  - `key={eq.id ? `${eq.id}-${idx}` : `eq-opt-${idx}`}`.
  - `key={evt.id ? `${evt.id}-${idx}` : `evt-${idx}`}`.

---

### 2. Administrator Credentials & Login Configuration

#### [server/database/config.ts]
- Update the default administrator seed user (`usr-admin-01`):
  - **Name**: `Mounesh A`
  - **Email**: `asokanmounesh@gmail.com`
  - **Password**: `a.MOUNESH14` (stored with direct comparison support)
  - **Role**: `ADMIN`

#### [server/routes/auth.routes.ts]
- In `/api/auth/login`:
  - Recognize `asokanmounesh@gmail.com` and password `a.MOUNESH14`, returning valid administrator session and JWT with `ADMIN` role.
- In `/api/auth/me`:
  - Return `asokanmounesh@gmail.com` with `Mounesh A` and `ADMIN` role as default admin profile.
- In `/api/auth/forgot-password`:
  - Include `asokanmounesh@gmail.com` in demo/admin recognized list for OTP generation.

#### [src/pages/LoginPage.tsx]
- Update default form inputs:
  - Email: `asokanmounesh@gmail.com`
  - Password: `a.MOUNESH14`
- Update the login hints section and role chips to display `asokanmounesh@gmail.com` and `a.MOUNESH14`.

## Verification Plan

### Automated Verification
- Run `compile_applet` to verify TypeScript compilation and zero build errors.

### Manual Verification
- Verify browser console produces zero `Encountered two children with the same key` warnings when navigating across Dashboard, Equipment, Calibration, Calendar, and Notifications pages.
- Log in with `asokanmounesh@gmail.com` and `a.MOUNESH14`.
- Confirm header displays `Mounesh A` with full administrator permissions.
- Test equipment filter dropdowns to verify clean option rendering with zero warnings.
