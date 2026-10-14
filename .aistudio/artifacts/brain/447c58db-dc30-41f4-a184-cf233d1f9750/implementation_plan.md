# Calibration Result Re-architecting & Outcome Management Plan

Transition Calibration Operations and Records management from legacy due-date schedule tabs (Due Soon, Overdue, Completed) to empirical metrology outcome classifications (**Passed**, **Passed with Adjustment**, **Failed**) with top summary telemetry metric cards and live filter tab counter badges.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> The user confirmed the following architectural and visual specifications:
> - **Filter Controls**: Replace the schedule-based filter tabs on the Calibration Management page with result-focused tabs: `All`, `Passed`, `Passed with Adjustment`, and `Failed`.
> - **Summary Counters & Metrics**: Display top summary metric cards providing instant counts and percentage ratios for each calibration outcome, as well as live numeric count badges directly within each filter tab.

- **Confirmed Decision 1**: Filter tabs will strictly filter historical calibration certificates and logs by `record.result` (`Passed`, `Passed with Adjustment`, `Failed`) rather than equipment schedule statuses (`due_soon`, `overdue`, `completed`).
- **Confirmed Decision 2**: Top summary cards will show real-time quantitative breakdowns for Passed (emerald/clinical green), Passed with Adjustment (amber/telemetry orange), Failed (rose/alert red), and Total Verified Audits.

---

## 1. Overview & Core Concept

- **What It Does**: Refactors the Calibration Operations & Records interface (`/calibration`) to classify calibration records according to certified metrological outcomes:
  1. **Passed**: Instrument meets all manufacturer specifications, tolerances, and repeatability standards without deviation.
  2. **Passed with Adjustment**: Instrument required recalibration, zero-point offset correction, span tuning, or bias compensation to meet operational tolerances.
  3. **Failed**: Instrument failed tolerance tests or hysteresis limits and is flagged for quarantine, sensor replacement, or factory servicing.
- **Target Audience / Persona**: Quality Assurance (QA) managers, metrology technicians, laboratory engineers, and compliance auditors (ISO/IEC 17025, GMP, FDA 21 CFR Part 11).
- **Key Value**: Provides an audit-ready, outcome-oriented view of laboratory instrumentation health, eliminating confusion caused by mixing scheduling states with calibration audit results.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Overview & Audit Health**: When the metrologist navigates to Calibration Management, they immediately see 4 high-density telemetry metric cards:
   - **Passed Calibrations**: Total count, percentage of total logs, emerald checkmark icon.
   - **Passed with Adjustment**: Total count, percentage needing compensation, amber adjustment icon.
   - **Failed Calibrations**: Total count, alert count indicator, rose warning icon.
   - **Total Audits Logged**: Cumulative certificates and records tracked.
2. **Outcome-Based Filtering**:
   - Metrologist clicks any of the 4 tab buttons: `All (N)`, `Passed (N)`, `Passed with Adjustment (N)`, or `Failed (N)`.
   - The table smoothly updates to render only matching certificates with tabular monospace serial numbers and status indicators.
3. **Interactive Search & Deep Inspection**:
   - The search bar filters records within the active outcome tab by certificate number, instrument code, equipment name, or service provider.
   - Clicking any row opens the certificate detail drawer / modal displaying full environmental parameters, technicians, standards used, and calibration certificates.

### Visual Identity & Theme Tokens

- **Aesthetic Direction**: Clinical, high-precision laboratory metrology styling adhering to domain guidelines (`Science, Space & Biotech`).
- **Color Palette & Accents**:
  - Primary Background: Crisp clinical white (`#FFFFFF`) / lab slate (`#F8FAFC`).
  - Structural Panels: Flat slate containers with 1px hairline borders (`border-slate-200`).
  - Outcome Semantics:
    - Passed: Emerald (`text-emerald-700 bg-emerald-50/80 border-emerald-200`).
    - Passed with Adjustment: Amber (`text-amber-700 bg-amber-50/80 border-amber-200`).
    - Failed: Rose (`text-rose-700 bg-rose-50/80 border-rose-200`).
- **Zero-Pill Restraint**: Quantitative tab counts are formatted as subtle typographic badges (`tabular-nums font-mono text-xs text-slate-500`) rather than garish capsule stickers.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Outcome Result vs. Schedule Status Separation**
  - *Chosen Approach*: Legacy tabs (`Due Soon`, `Overdue`, `Completed`) belonged to schedule tracking (already handled in the Dashboard and Equipment List status filters). In Calibration Management, records represent completed or logged calibration events. Categorizing by result (`Passed`, `Passed with Adjustment`, `Failed`) directly answers QA audit requirements.
  - *Why*: Eliminates ambiguous and non-functional tabs where records with 'Completed' status overlapped with 'Due Soon' equipment.
- **Decision 2: Summary Metrics Cards with Quick-Filter Interaction**
  - *Chosen Approach*: Top summary cards will display aggregated numbers and clicking a card can seamlessly switch the active tab to that outcome.
  - *Why*: Faster navigation for technicians auditing failing or adjusted equipment.

---

## 4. Technical Architecture & Data Strategy

### Component & Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       App.tsx Root State                     │
│  - calibrationRecords: CalibrationRecord[]                  │
│  - equipmentList: Equipment[]                                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    CalibrationPage.tsx                       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Outcome Summary Metric Cards                          │  │
│  │ [ Passed: N ] [ Adjusted: N ] [ Failed: N ] [ Total ] │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Segmented Outcome Tabs:                               │  │
│  │ [ All (N) ] [ Passed (N) ] [ Adjusted (N) ] [ Failed ] │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Filtered Certificates Table                           │  │
│  │ Filter: (rec.result === activeTab) && matchesSearch   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### State Mutations & Filtering Logic

```typescript
type CalibrationOutcomeTab = 'All' | 'Passed' | 'Passed with Adjustment' | 'Failed';

// Tab Count Calculations
const counts = useMemo(() => {
  return {
    all: calibrationRecords.length,
    passed: calibrationRecords.filter(r => r.result === 'Passed').length,
    passedWithAdjustment: calibrationRecords.filter(r => r.result === 'Passed with Adjustment').length,
    failed: calibrationRecords.filter(r => r.result === 'Failed').length,
  };
}, [calibrationRecords]);

// Record Filtering Predicate
const filteredRecords = useMemo(() => {
  return calibrationRecords.filter((rec) => {
    if (activeTab === 'Passed' && rec.result !== 'Passed') return false;
    if (activeTab === 'Passed with Adjustment' && rec.result !== 'Passed with Adjustment') return false;
    if (activeTab === 'Failed' && rec.result !== 'Failed') return false;

    // Search Query Matching
    return (
      searchQuery === '' ||
      rec.equipmentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.equipmentCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.serviceProvider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
}, [calibrationRecords, activeTab, searchQuery]);
```

### Verification & Testing Plan

1. Verify metric counters render correct numbers based on loaded calibration records.
2. Click each outcome tab (`All`, `Passed`, `Passed with Adjustment`, `Failed`) to ensure matching rows are displayed.
3. Test search filter simultaneously with outcome tabs.
4. Log a new calibration record with different results (`Passed`, `Passed with Adjustment`, `Failed`) and verify instantaneous counter updates and table presence.
5. Verify production compilation via `compile_applet`.
