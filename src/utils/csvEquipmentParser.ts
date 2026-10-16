import { Equipment } from '../types';
import { SCHOOL_COLLEGE_CATEGORIES, SCHOOL_COLLEGE_DEPARTMENTS } from '../constants/schoolLabPresets';

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

export const VALID_CATEGORIES: string[] = [
  ...SCHOOL_COLLEGE_CATEGORIES,
  'Balances & Scales',
  'Spectroscopy',
  'Centrifuges',
  'Electrochemistry',
  'Thermal & Environmental',
  'Chromatography',
  'Sterilization',
];

export const VALID_DEPARTMENTS: string[] = [
  ...SCHOOL_COLLEGE_DEPARTMENTS,
  'Analytical Chemistry',
  'Microbiology',
  'Quality Control',
  'R&D Formulation',
  'Bioassay',
];

// Helper to normalize category from string
function matchCategory(input: string): Equipment['category'] {
  const trimmed = input.trim();
  if (!trimmed) return 'Measurement & Metrology';

  const norm = trimmed.toLowerCase();
  for (const cat of VALID_CATEGORIES) {
    if (cat.toLowerCase() === norm) return cat;
  }
  if (norm.includes('optic') || norm.includes('microscope') || norm.includes('telescope') || norm.includes('lens')) return 'Optical Instruments';
  if (norm.includes('electric') || norm.includes('circuit') || norm.includes('oscillo') || norm.includes('multimeter')) return 'Electrical & Electronics';
  if (norm.includes('thermal') || norm.includes('heat') || norm.includes('burner') || norm.includes('oven')) return 'Thermal & Heating';
  if (norm.includes('glass') || norm.includes('titrat') || norm.includes('burette') || norm.includes('pipette')) return 'Chemical & Glassware Apparatus';
  if (norm.includes('bio') || norm.includes('dissect') || norm.includes('specimen')) return 'Biological & Specimen Equipment';
  if (norm.includes('robot') || norm.includes('comput') || norm.includes('arduino') || norm.includes('sensor')) return 'Computing & Robotics Hardware';
  if (norm.includes('balance') || norm.includes('scale') || norm.includes('caliper') || norm.includes('gauge') || norm.includes('meter')) return 'Measurement & Metrology';

  // Return custom user string directly
  return trimmed;
}

// Helper to normalize department from string
function matchDepartment(input: string): Equipment['department'] {
  const trimmed = input.trim();
  if (!trimmed) return 'Physics Lab';

  const norm = trimmed.toLowerCase();
  for (const dept of VALID_DEPARTMENTS) {
    if (dept.toLowerCase() === norm) return dept;
  }
  if (norm.includes('physic')) return 'Physics Lab';
  if (norm.includes('chem')) return 'Chemistry Lab';
  if (norm.includes('bio') || norm.includes('botany') || norm.includes('zoology')) return 'Biology Lab';
  if (norm.includes('comput') || norm.includes('cs') || norm.includes('it') || norm.includes('software')) return 'Computer Science Lab';
  if (norm.includes('engineer') || norm.includes('robot') || norm.includes('mech') || norm.includes('electr')) return 'Engineering & Robotics Lab';

  // Return custom user string directly
  return trimmed;
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
      'EQ-SCH-101',
      'Digital Analytical Balance',
      'Measurement & Metrology',
      'Mettler Toledo',
      'ME204T',
      'SN-MT-88412',
      'Physics Lab',
      'Physics Lab - Bench 2',
      '2024-05-15',
      '6',
      '2026-02-10',
      'Dr. Sarah Lin',
      'Class F1 stainless steel standard weights calibration',
    ],
    [
      'EQ-SCH-102',
      'Binocular Compound Optical Microscope',
      'Optical Instruments',
      'Olympus',
      'CX23',
      'SN-OLY-44120',
      'Biology Lab',
      'Biology Suite 1',
      '2023-11-20',
      '12',
      '2025-10-15',
      'Marcus Vance',
      'Objective lenses 4x, 10x, 40x, 100x oil immersion',
    ],
    [
      'EQ-SCH-103',
      'Digital Storage Oscilloscope 100MHz',
      'Electrical & Electronics',
      'Tektronix',
      'TBS1102B',
      'SN-TK-90311',
      'Computer Science Lab',
      'Hardware Lab Room 3',
      '2024-01-10',
      '6',
      '2026-01-20',
      'Mounesh A',
      'Dual channel 2GS/s sampling rate frequency verification',
    ],
    [
      'EQ-SCH-104',
      'Digital Magnetic Stirrer with Ceramic Hot Plate',
      'Thermal & Heating',
      'Corning',
      'PC-420D',
      'SN-CR-67123',
      'Chemistry Lab',
      'Inorganic Chemistry Bench 4',
      '2023-08-05',
      '6',
      '2026-03-01',
      'Dr. Sarah Lin',
      'Temperature sensor probe calibration up to 550 C',
    ],
    [
      'EQ-SCH-105',
      'Benchtop Clinical Centrifuge',
      'Biological & Specimen Equipment',
      'Eppendorf',
      '5702R',
      'SN-EP-31094',
      'Biology Lab',
      'Specimen Prep Bench',
      '2023-09-12',
      '12',
      '2025-09-01',
      'Marcus Vance',
      'Rotor speed 4400 RPM tachometer calibration',
    ],
    [
      'EQ-SCH-106',
      'Robotics & Microcontroller Workstation',
      'Computing & Robotics Hardware',
      'National Instruments',
      'myRIO-1900',
      'SN-NI-55091',
      'Engineering & Robotics Lab',
      'Robotics Studio 2',
      '2024-03-18',
      '6',
      '2026-02-28',
      'Mounesh A',
      'FPGA I/O channels and analog input calibration',
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
