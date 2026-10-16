# Implementation Plan: School & College Laboratory Presets with Custom Autocomplete Input

Update the equipment category and laboratory department configurations throughout the application to suit academic school and college laboratories (Physics, Chemistry, Biology, Computer Science, and Engineering Labs), and provide direct text typing with an autocomplete dropdown suggestion list for arbitrary custom inputs.

---

## 1. Requirement & User Clarification Summary

- **Academic Presets**: Preload standard school and college laboratory departments:
  - Physics Lab
  - Chemistry Lab
  - Biology Lab
  - Computer Science Lab
  - Engineering & Robotics Lab
  - General Science Lab
  - Mathematics & Instrumentation Lab
- **Equipment Categories tailored for Academic Labs**:
  - Optical Instruments (Microscopes, Telescopes, Spectrometers, Prisms)
  - Measurement & Metrology (Balances, Vernier Calipers, Screw Gauges, Meter Rules)
  - Electrical & Electronics (Oscilloscopes, Multimeters, Power Supplies, Signal Generators)
  - Thermal & Heating (Bunsen Burners, Water Baths, Hot Plates, Incubators, Autoclaves)
  - Chemical & Glassware Apparatus (Burettes, Pipettes, Titration Units, Centrifuges)
  - Biological & Specimen Equipment (Centrifuges, Dissection Kits, Hemocytometers)
  - Computing & Robotics Hardware (Microcontrollers, Sensor Kits, Workstations, 3D Printers)
  - General Laboratory Apparatus
- **Custom Input Option**:
  - Replace rigid select dropdowns with an **autocomplete combobox input component**.
  - Users can either pick from the school/college suggestion list or type **any custom value** directly into the field.
- **Scope**:
  - Apply to both **Register New Equipment** (`AddEquipmentPage.tsx`) and **Edit Equipment Metadata Modal** (`EquipmentListPage.tsx`), and support custom categories in registry filters and CSV import.

---

## 2. Proposed Architectural Changes

### A. TypeScript Type Definitions (`src/types/index.ts`)
- Update `Equipment['category']` and `Equipment['department']` from rigid industrial pharmaceutical unions to flexible string types supporting academic presets while allowing arbitrary custom strings:
  ```ts
  export type AcademicDepartment =
    | 'Physics Lab'
    | 'Chemistry Lab'
    | 'Biology Lab'
    | 'Computer Science Lab'
    | 'Engineering & Robotics Lab'
    | 'General Science Lab'
    | (string & {});

  export type AcademicCategory =
    | 'Measurement & Metrology'
    | 'Optical Instruments'
    | 'Electrical & Electronics'
    | 'Thermal & Heating'
    | 'Chemical & Glassware Apparatus'
    | 'Biological & Specimen Equipment'
    | 'Computing & Robotics Hardware'
    | 'General Laboratory Apparatus'
    | (string & {});
  ```

---

### B. Shared Autocomplete Combobox Component (`src/components/common/AutocompleteInput.tsx`)
- Build a lightweight, accessible combobox input:
  - Renders a styled input with a dropdown chevron button.
  - As the user types, filters suggestions in real time.
  - Clicking the input or dropdown chevron reveals the school/college suggestion list.
  - Clicking a suggestion selects it immediately.
  - Allows typing any custom string freely (no lock-in).
  - Outside click closes the suggestion panel.

---

### C. Update Register New Equipment Form (`src/pages/AddEquipmentPage.tsx`)
- Update initial state defaults:
  - `department`: `'Physics Lab'`
  - `category`: `'Measurement & Metrology'`
- Replace rigid `<Select>` with `<AutocompleteInput>` for both **Equipment Category** and **Laboratory Department**.
- Provide pre-populated school & college presets list with a "Custom" label hint.

---

### D. Update Edit Equipment Modal (`src/pages/EquipmentListPage.tsx`)
- Replace the static `<Select>` options in the Edit Metadata Modal with `<AutocompleteInput>` for Category and Department.
- Ensure existing equipment with legacy or custom categories load and edit without breaking.

---

### E. Registry Filters & CSV Import Verification
- In `EquipmentListPage.tsx`, ensure filter dropdowns combine preloaded academic categories/departments with any newly registered custom categories from the active equipment list.
- In `src/utils/csvEquipmentParser.ts`, ensure CSV import accepts any custom academic department or category without validation rejection.

---

## 3. Verification Plan

### Automated Verification
- Run `lint_applet` (`tsc --noEmit`) to verify zero TypeScript errors.
- Run `compile_applet` to ensure successful bundle compilation.

### Manual Verification
1. **New Equipment Registration**:
   - Navigate to `/equipment/new`.
   - Verify category and department fields display academic options (Physics Lab, Chemistry Lab, etc.).
   - Type a custom category (e.g., "Photonics & Laser Lab" or "Robotics Kit") and a custom department (e.g., "Advanced Mechatronics").
   - Submit the form and verify the new instrument is registered with the custom category and department.
2. **Edit Equipment Modal**:
   - In Equipment Registry, click **Actions -> Edit Metadata** on any instrument.
   - Verify the autocomplete dropdown suggestions show school/college presets.
   - Enter a custom value and save. Verify the table reflects the updated custom value immediately.
3. **Filter Test**:
   - In Equipment Registry, verify category and department filter dropdowns include both preset academic categories and user-created custom categories.
