import { Equipment } from '../types';

export interface ParsedEquipmentRow {
  rowNumber: number;
  equipment_code: string;
  name: string;
  category: Equipment['category'];
  manufacturer: string;
  model_number: string;
  serial_number: string;
  department: Equipment['department'];
  location: string;
  purchase_date: string;
  calibration_interval_days: number;
  calibration_interval_months: number;
  last_calibration_date: string;
  assigned_technician: string;
  description: string;
  status: 'VALID' | 'DUPLICATE' | 'INVALID';
  errors: string[];
  duplicateReason?: string;
}

export const VALID_CATEGORIES: Equipment['category'][] = [
  'Balances & Scales',
  'Spectroscopy',
  'Centrifuges',
  'Electrochemistry',
  'Thermal & Environmental',
  'Chromatography',
  'Sterilization',
];

export const VALID_DEPARTMENTS: Equipment['department'][] = [
  'Analytical Chemistry',
  'Microbiology',
  'Quality Control',
  'R&D Formulation',
  'Bioassay',
];

// Helper to normalize category from string
function matchCategory(input: string): Equipment['category'] {
  const norm = input.trim().toLowerCase();
  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === norm) return cat;
  }
  if (norm.includes('balance') || norm.includes('scale')) return 'Balances & Scales';
  if (norm.includes('spectro') || norm.includes('uv') || norm.includes('ftir')) return 'Spectroscopy';
  if (norm.includes('centrifuge')) return 'Centrifuges';
  if (norm.includes('ph') || norm.includes('electro') || norm.includes('conductivity')) return 'Electrochemistry';
  if (norm.includes('temp') || norm.includes('oven') || norm.includes('incubator') || norm.includes('thermal') || norm.includes('chamber')) return 'Thermal & Environmental';
  if (norm.includes('chromat') || norm.includes('hplc') || norm.includes('gc')) return 'Chromatography';
  if (norm.includes('steril') || norm.includes('autoclave')) return 'Sterilization';
  return 'Balances & Scales';
}

// Helper to normalize department from string
function matchDepartment(input: string): Equipment['department'] {
  const norm = input.trim().toLowerCase();
  for (const dept of VALID_DEPARTMENTS) {
    if (dept.toLowerCase() === norm) return dept;
  }
  if (norm.includes('chem') || norm.includes('analytical')) return 'Analytical Chemistry';
  if (norm.includes('micro')) return 'Microbiology';
  if (norm.includes('quality') || norm.includes('qc') || norm.includes('qa')) return 'Quality Control';
  if (norm.includes('r&d') || norm.includes('formulation') || norm.includes('research')) return 'R&D Formulation';
  if (norm.includes('bio') || norm.includes('assay')) return 'Bioassay';
  return 'Quality Control';
}

// Robust CSV parser supporting quotes, commas, escaped quotes, and newlines
export function parseRawCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      currentRow.push(currentField.trim());
      // Only push non-empty rows
      if (currentRow.some((f) => f.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Map column names to standard keys
function getHeaderIndexMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};

  headers.forEach((h, idx) => {
    const clean = h.toLowerCase().replace(/[\s_-]+/g, '');

    if (clean === 'equipmentcode' || clean === 'code' || clean === 'equipmentid' || clean === 'id' || clean === 'assetid' || clean === 'tag' || clean === 'instrumentid') {
      map['equipment_code'] = idx;
    } else if (clean === 'equipmentname' || clean === 'name' || clean === 'instrumentname' || clean === 'devicename' || clean === 'title') {
      map['name'] = idx;
    } else if (clean === 'category' || clean === 'equipmentcategory' || clean === 'type' || clean === 'instrumenttype') {
      map['category'] = idx;
    } else if (clean === 'manufacturer' || clean === 'make' || clean === 'vendor' || clean === 'brand') {
      map['manufacturer'] = idx;
    } else if (clean === 'model' || clean === 'modelnumber' || clean === 'modelno' || clean === 'modelnum') {
      map['model_number'] = idx;
    } else if (clean === 'serialnumber' || clean === 'serial' || clean === 'serialno' || clean === 'sn') {
      map['serial_number'] = idx;
    } else if (clean === 'department' || clean === 'dept' || clean === 'division' || clean === 'labsection') {
      map['department'] = idx;
    } else if (clean === 'location' || clean === 'room' || clean === 'bench' || clean === 'lablocation' || clean === 'lab') {
      map['location'] = idx;
    } else if (clean === 'purchasedate' || clean === 'purchase' || clean === 'acquisitiondate' || clean === 'acquired') {
      map['purchase_date'] = idx;
    } else if (
      clean === 'calibrationintervalmonths' ||
      clean === 'intervalmonths' ||
      clean === 'interval' ||
      clean === 'calibrationinterval' ||
      clean === 'frequency'
    ) {
      map['interval_months'] = idx;
    } else if (clean === 'calibrationintervaldays' || clean === 'intervaldays') {
      map['interval_days'] = idx;
    } else if (
      clean === 'lastcalibrationdate' ||
      clean === 'lastcalibrated' ||
      clean === 'lastcal' ||
      clean === 'caldate' ||
      clean === 'calibrationdate'
    ) {
      map['last_calibration_date'] = idx;
    } else if (clean === 'assignedtechnician' || clean === 'technician' || clean === 'assignedto' || clean === 'operator') {
      map['assigned_technician'] = idx;
    } else if (clean === 'description' || clean === 'notes' || clean === 'remarks' || clean === 'specs' || clean === 'specifications') {
      map['description'] = idx;
    }
  });

  return map;
}

// Validate date string (YYYY-MM-DD or standard ISO date)
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return true; // empty optional dates are okay
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

function formatDateString(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toISOString().split('T')[0];
}

// Parse and validate rows against existing equipment list
export function processEquipmentCsv(
  csvText: string,
  existingEquipment: Equipment[]
): {
  rows: ParsedEquipmentRow[];
  totalCount: number;
  validCount: number;
  duplicateCount: number;
  errorCount: number;
} {
  const table = parseRawCsvText(csvText);
  if (table.length < 2) {
    return {
      rows: [],
      totalCount: 0,
      validCount: 0,
      duplicateCount: 0,
      errorCount: 0,
    };
  }

  const headers = table[0];
  const headerMap = getHeaderIndexMap(headers);
  const dataRows = table.slice(1);

  // Index existing codes and serials
  const existingCodes = new Set<string>();
  const existingSerials = new Set<string>();

  existingEquipment.forEach((eq) => {
    if (eq.code) existingCodes.add(eq.code.trim().toLowerCase());
    if (eq.serialNumber) existingSerials.add(eq.serialNumber.trim().toLowerCase());
  });

  // Track codes and serials within this CSV to detect intra-file duplicates
  const batchSeenCodes = new Set<string>();
  const batchSeenSerials = new Set<string>();

  const parsedRows: ParsedEquipmentRow[] = [];

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2; // 1-based, accounting for header row
    const getVal = (key: string): string => {
      const colIdx = headerMap[key];
      return colIdx !== undefined && row[colIdx] ? row[colIdx].trim() : '';
    };

    const code = getVal('equipment_code');
    const name = getVal('name');
    const rawCategory = getVal('category');
    const manufacturer = getVal('manufacturer') || 'Standard Metrology Corp';
    const modelNumber = getVal('model_number') || 'Standard-X';
    const serialNumber = getVal('serial_number');
    const rawDepartment = getVal('department');
    const location = getVal('location') || 'Central Laboratory - Analytical Bay';
    const purchaseDate = formatDateString(getVal('purchase_date')) || '2024-01-01';
    const lastCalDate = formatDateString(getVal('last_calibration_date'));
    const assignedTechnician = getVal('assigned_technician') || 'Unassigned Technician';
    const description = getVal('description');

    // Interval handling: months or days
    let intervalMonths = 6;
    let intervalDays = 180;

    const rawIntervalDays = getVal('interval_days');
    const rawIntervalMonths = getVal('interval_months');

    if (rawIntervalDays && !isNaN(Number(rawIntervalDays)) && Number(rawIntervalDays) > 0) {
      intervalDays = Number(rawIntervalDays);
      intervalMonths = Math.max(1, Math.round(intervalDays / 30));
    } else if (rawIntervalMonths && !isNaN(Number(rawIntervalMonths)) && Number(rawIntervalMonths) > 0) {
      intervalMonths = Number(rawIntervalMonths);
      intervalDays = intervalMonths * 30;
    }

    const category = matchCategory(rawCategory || 'Balances & Scales');
    const department = matchDepartment(rawDepartment || 'Quality Control');

    const errors: string[] = [];
    let duplicateReason: string | undefined;

    // Field validations
    if (!code) {
      errors.push('Equipment Code is required.');
    }
    if (!name) {
      errors.push('Equipment Name is required.');
    }
    if (!rawCategory) {
      errors.push('Equipment Category is required.');
    }
    if (getVal('last_calibration_date') && !isValidDate(getVal('last_calibration_date'))) {
      errors.push('Last Calibration Date must be a valid date format (YYYY-MM-DD).');
    }
    if (getVal('purchase_date') && !isValidDate(getVal('purchase_date'))) {
      errors.push('Purchase Date must be a valid date format (YYYY-MM-DD).');
    }

    // Duplicate detection
    let isDuplicate = false;
    if (code) {
      const lowerCode = code.toLowerCase();
      if (existingCodes.has(lowerCode)) {
        isDuplicate = true;
        duplicateReason = `Equipment Code "${code}" is already registered in active database.`;
      } else if (batchSeenCodes.has(lowerCode)) {
        isDuplicate = true;
        duplicateReason = `Duplicate equipment code "${code}" repeats in this CSV file.`;
      } else {
        batchSeenCodes.add(lowerCode);
      }
    }

    if (!isDuplicate && serialNumber) {
      const lowerSerial = serialNumber.toLowerCase();
      if (existingSerials.has(lowerSerial)) {
        isDuplicate = true;
        duplicateReason = `Serial number "${serialNumber}" already exists in active database.`;
      } else if (batchSeenSerials.has(lowerSerial)) {
        isDuplicate = true;
        duplicateReason = `Duplicate serial number "${serialNumber}" repeats in this CSV file.`;
      } else {
        batchSeenSerials.add(lowerSerial);
      }
    }

    let status: ParsedEquipmentRow['status'] = 'VALID';
    if (errors.length > 0) {
      status = 'INVALID';
    } else if (isDuplicate) {
      status = 'DUPLICATE';
    }

    parsedRows.push({
      rowNumber,
      equipment_code: code,
      name,
      category,
      manufacturer,
      model_number: modelNumber,
      serial_number: serialNumber || `SN-${code || index + 1}`,
      department,
      location,
      purchase_date: purchaseDate,
      calibration_interval_days: intervalDays,
      calibration_interval_months: intervalMonths,
      last_calibration_date: lastCalDate,
      assigned_technician: assignedTechnician,
      description,
      status,
      errors,
      duplicateReason,
    });
  });

  const validCount = parsedRows.filter((r) => r.status === 'VALID').length;
  const duplicateCount = parsedRows.filter((r) => r.status === 'DUPLICATE').length;
  const errorCount = parsedRows.filter((r) => r.status === 'INVALID').length;

  return {
    rows: parsedRows,
    totalCount: parsedRows.length,
    validCount,
    duplicateCount,
    errorCount,
  };
}

// Generate downloadable sample CSV template
export function generateEquipmentSampleCsv(): string {
  const headers = [
    'equipment_code',
    'name',
    'category',
    'manufacturer',
    'model',
    'serial_number',
    'department',
    'location',
    'purchase_date',
    'calibration_interval_months',
    'last_calibration_date',
    'assigned_technician',
    'description',
  ];

  const sampleRows = [
    [
      'EQ-201',
      'Analytical Balance 0.1mg',
      'Balances & Scales',
      'Mettler Toledo',
      'XSR205',
      'SN-MT-88412',
      'Quality Control',
      'Lab 3B - Bench 2',
      '2023-05-15',
      '6',
      '2026-02-10',
      'Dr. Sarah Lin',
      'Dual-range microbalance with motorized internal calibration',
    ],
    [
      'EQ-202',
      'Double Beam UV-Vis Spectrophotometer',
      'Spectroscopy',
      'Shimadzu',
      'UV-1900i',
      'SN-SH-44120',
      'Analytical Chemistry',
      'Optical Suite 1',
      '2022-11-20',
      '12',
      '2025-10-15',
      'Alex Mercer',
      'Wavelength 190-1100 nm for pharmaceutical active assay testing',
    ],
    [
      'EQ-203',
      'Refrigerated High-Speed Centrifuge',
      'Centrifuges',
      'Beckman Coulter',
      'Avanti J-15R',
      'SN-BC-90311',
      'Microbiology',
      'Bio Prep Room 2',
      '2024-01-10',
      '6',
      '2026-01-20',
      'Elena Rostova',
      'Max speed 10200 RPM with temp range -10 to +40 C',
    ],
    [
      'EQ-204',
      'Benchtop Multi-Parameter pH/ORP Meter',
      'Electrochemistry',
      'Thermo Scientific',
      'Orion Star A211',
      'SN-TS-67123',
      'Quality Control',
      'Wet Chemistry Bench 4',
      '2023-08-05',
      '3',
      '2026-03-01',
      'Dr. Sarah Lin',
      '3-point buffer calibration ISO 17025 compliant probe',
    ],
    [
      'EQ-205',
      'Forced Convection Lab Incubator',
      'Thermal & Environmental',
      'Memmert',
      'IN55',
      'SN-MM-31094',
      'Microbiology',
      'Incubation Room 4A',
      '2021-09-12',
      '12',
      '2025-09-01',
      'Marcus Vance',
      'Chamber 53L with dual PT100 temperature sensors',
    ],
    [
      'EQ-206',
      'High-Performance Liquid Chromatograph',
      'Chromatography',
      'Waters',
      'Alliance e2695',
      'SN-WT-55091',
      'Analytical Chemistry',
      'Chromatography Lab 2',
      '2023-03-18',
      '6',
      '2026-02-28',
      'Alex Mercer',
      'Quaternary pump with vacuum degasser and autosampler',
    ],
  ];

  const escapeCsv = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const lines = [
    headers.join(','),
    ...sampleRows.map((r) => r.map((c) => escapeCsv(String(c))).join(',')),
  ];

  return lines.join('\n');
}

// Trigger device file download for sample CSV
export function downloadSampleEquipmentCsv(): void {
  const content = generateEquipmentSampleCsv();
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'laboratory_equipment_import_template.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
