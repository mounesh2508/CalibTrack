# ML Calibration Interval Recommendation Engine

Predict and recommend optimal laboratory calibration intervals using an adaptive regression model with drift reliability scoring based on historical calibration records, instrument age, and environmental stability.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural and user experience decisions have been aligned based on your specifications:
> - **Input Factors**: The model analyzes **historical calibration records** (pass rate, adjustments, drift), **instrument age** (years since acquisition/commissioning), and **ambient environmental stability** (temperature and humidity variance).
> - **Surface Placement**: Recommendations appear directly embedded within the **Add Instrument form**, the **Edit Equipment modal**, and the **Equipment Details page** (with full factor explanation, confidence level, and 1-click application).
> - **Model Approach**: An **adaptive regression model with drift reliability scoring**, bounded by ISO 17025 laboratory safeguards (30-day minimum, 365-day maximum).

---

## 1. Overview & Core Concept

- **What It Does**: Replaces static, arbitrary 6-month or 12-month calibration cycles with dynamic, data-driven interval recommendations tailored to each individual instrument's actual reliability record, age, and operating conditions.
- **Target Persona**: Metrology Supervisors, Laboratory Technicians, and Academic Lab Custodians maintaining physics, chemistry, biology, and engineering laboratory apparatus.
- **Key Value**:
  - **Reduces Unnecessary Downtime**: Extends intervals for highly stable, pristine instruments (e.g. from 6 months to 9 or 12 months) backed by quantitative proof.
  - **Prevents Out-of-Tolerance Failures**: Automatically tightens intervals (e.g. from 12 months to 3 or 6 months) for aging, drifting, or environmentally stressed instruments before failures occur.
  - **Defensible Compliance**: Provides an auditable mathematical rationale with reliability scores and factor weightings aligned with ISO 17025 recommendations.

---

## 2. User Experience & Visual Design

Following the **Universal Frontend Design Constitution** and **Science, Space & Biotech** guidelines:

### A. Add Instrument Screen (`src/pages/AddEquipmentPage.tsx`)
- Inside **Section 3: Calibration Schedule & Metrology Specs**:
  - Beside the manual interval selector, display an inline **ML Recommended Interval** assistant.
  - As the user enters category, department, and purchase date, the model computes a baseline recommended interval in real time.
  - Provides a single-click button: `"Apply ML Recommendation"` to automatically populate the interval field.

### B. Equipment Details Screen (`src/pages/EquipmentDetailsPage.tsx`)
- In the right-hand inspection column, add an **ML Calibration Interval Recommendation & Reliability Analysis** card:
  - **Current Interval vs. Recommended Interval**: Side-by-side comparison with net difference (`+3 months` or `-3 months`).
  - **Empirical Reliability Score**: Formatted with tabular monospace precision (e.g., `94.5% High Stability`).
  - **Factor Weighting Breakdown**:
    - *Historical Calibration Drift*: Track records of passed vs. adjusted vs. failed calibrations.
    - *Environmental Stability*: Temperature & relative humidity fluctuation penalties.
    - *Equipment Aging & Wear Curve*: Depreciation curve based on years in service.
  - **One-Click Apply Action**: `"Update Interval to Recommended"`, which recalculates the next calibration date and updates the database immediately.

### C. Quick Edit Modal (`src/pages/EquipmentListPage.tsx`)
- When editing any existing instrument, an unobtrusive recommendation callout highlights whether the instrument is currently over-calibrated or at risk, allowing technicians to adopt the recommended interval instantly.

### D. Visual Restraint & Typography
- Clean unboxed metadata with `·` separators (strictly no static pill badges).
- Tabular monospace numbers (`font-mono tabular-nums`) for percentages, variances, and day intervals.
- Non-hue-only status reporting (`● High Stability`, `▲ Moderate Drift`, `✖ Critical Wear`).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dual Client/Server Architecture**:
  - *Chosen Approach*: Encapsulate the core mathematical ML model in a shared TypeScript metrology engine (`src/utils/calibrationIntervalMl.ts` and `server/services/mlInterval.service.ts`).
  - *Why*: Delivers zero-latency, reactive feedback in the browser during form data entry, while also exposing a dedicated serverless REST endpoint (`GET /api/equipment/:id/recommended-interval` and `POST /api/equipment/:id/apply-interval`) for persistent audit trails.
- **Decision 2: Clamped ISO 17025 Boundaries**:
  - *Chosen Approach*: Clamp all generated interval recommendations between 30 days (1 month) and 365 days (12 months), snapping to standard operational intervals (1, 3, 6, 9, 12 months) with fractional day precision.
  - *Why*: Metrology laboratories operate on standard inspection windows; unconstrained models recommending e.g. 73 days disrupt operational calibration vendor contracts.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Input Feature Vectors                           │
│  - Historical Calibration Records (Passed, Adjusted, Failed)           │
│  - Instrument Age (Commissioning / Purchase Date to Current Date)      │
│  - Environmental Conditions (Ambient Temp °C & Humidity %RH Variance)  │
│  - Metrological Category Baselines (Physics, Chemistry, Metrology)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               ML Adaptive Regression & Drift Scoring Engine            │
│                                                                        │
│  1. Reliability Score R_hist = (1.0 * passed + 0.5 * adj + 0 * fail)  │
│  2. Drift Factor D = exp(-drift_penalty * consecutive_adjustments)     │
│  3. Age Decay Factor A = max(0.65, 1.0 - 0.04 * age_in_years)         │
│  4. Environmental Stress E = max(0.70, 1.0 - (temp_var + rh_var))     │
│                                                                        │
│  Predicted Days = BaseIntervalDays * R_hist * D * A * E                │
│  Clamped Interval: [30 days, 365 days] -> Nearest Optimal Month Preset │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
┌───────────────────────────────────┐ ┌──────────────────────────────────┐
│      Client-Side Components       │ │      Backend REST Endpoints      │
│ - AddEquipmentPage: Live ML Hint  │ │ - GET  /api/equipment/:id/       │
│ - EquipmentDetailsPage: Analysis  │ │        recommended-interval      │
│ - EquipmentListPage: Edit Modal   │ │ - POST /api/equipment/:id/       │
│ - StatusBadge & Trend Indicators  │ │        apply-interval            │
└───────────────────────────────────┘ └──────────────────────────────────┘
```

---

## 5. Implementation Roadmap

1. **ML Recommendation Engine (`src/utils/calibrationIntervalMl.ts`)**:
   - Build pure TypeScript ML regression model taking calibration history, equipment age, and environmental parameters.
   - Return recommended interval (days & months), reliability score (0-100%), confidence score, and explainability factors.
2. **Backend API Endpoints (`server/routes/equipment.routes.ts` & `server/services/equipment.service.ts`)**:
   - Expose `GET /api/equipment/:id/recommended-interval` computing prediction based on stored calibration records and equipment data.
   - Expose `POST /api/equipment/:id/apply-interval` to update equipment interval, recalculate next calibration date, and log an audit notification.
3. **Frontend Integration**:
   - `AddEquipmentPage.tsx`: Add reactive ML recommendation preview with 1-click apply.
   - `EquipmentDetailsPage.tsx`: Add comprehensive ML reliability & interval analysis card with factor breakdown.
   - `EquipmentListPage.tsx`: Add recommended interval chip in quick edit modal.
4. **Verification & Testing**:
   - Automated unit tests covering diverse scenarios (brand new instrument, aging drifting instrument, pristine calibration history).
   - Verify zero lint and compilation errors with `compile_applet`.
