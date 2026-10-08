import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import dotenv from 'dotenv';
import {
  EquipmentEntity,
  CalibrationRecordEntity,
  NotificationEntity,
  ReminderSettingsEntity,
  User,
} from '../models';

dotenv.config();

export interface DbStatus {
  connected: boolean;
  type: 'mysql' | 'memory-fallback';
  message: string;
  databaseName?: string;
}

let pool: Pool | null = null;
let isUsingFallback = false;
let dbStatus: DbStatus = {
  connected: false,
  type: 'memory-fallback',
  message: 'Initializing database...',
};

// =====================================================================
// In-Memory Fallback Data Store (Populated with 15 equipment, 20 calibrations, 2 users, etc.)
// =====================================================================
class MemoryStore {
  users: User[] = [];
  equipment: EquipmentEntity[] = [];
  calibrationRecords: CalibrationRecordEntity[] = [];
  notifications: NotificationEntity[] = [];
  reminderSettings: ReminderSettingsEntity[] = [];

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    // 2 Users
    this.users = [
      {
        id: 'usr-admin-01',
        name: 'Dr. Sarah Lin',
        email: 'sarah.lin@calibtrack.lab',
        password_hash: '$2b$10$wT2829XQ1930mockAdminHashHere',
        role: 'ADMIN',
        created_at: '2026-01-01T08:00:00Z',
        updated_at: '2026-01-01T08:00:00Z',
      },
      {
        id: 'usr-tech-02',
        name: 'Marcus Vance',
        email: 'marcus.vance@calibtrack.lab',
        password_hash: '$2b$10$wT2829XQ1930mockTechHashHere',
        role: 'TECHNICIAN',
        created_at: '2026-01-05T09:00:00Z',
        updated_at: '2026-01-05T09:00:00Z',
      },
    ];

    // 15 Equipment items with realistic laboratory names and states
    this.equipment = [
      {
        id: 'eq-001',
        equipment_code: 'EQ-2024-001',
        name: 'Analytical Balance XPR205',
        category: 'Balances & Scales',
        manufacturer: 'Mettler Toledo',
        model_number: 'XPR205 DualRange',
        serial_number: 'MT-88492019',
        location: 'Lab 1A - Clean Bench 02',
        department: 'Analytical Chemistry',
        purchase_date: '2023-03-15',
        calibration_interval_days: 180,
        last_calibration_date: '2026-04-10',
        next_calibration_date: '2026-10-10',
        status: 'DUE_SOON',
        description: 'Precision 5-decimal analytical balance used for high-potency API reference standard weighings.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-04-10T14:30:00Z',
      },
      {
        id: 'eq-002',
        equipment_code: 'EQ-2024-002',
        name: 'UV-Visible Spectrophotometer',
        category: 'Spectroscopy',
        manufacturer: 'Shimadzu',
        model_number: 'UV-2600i Double Beam',
        serial_number: 'SH-551042-JP',
        location: 'Lab 2C - Instrument Room 3',
        department: 'Quality Control',
        purchase_date: '2022-08-20',
        calibration_interval_days: 365,
        last_calibration_date: '2025-09-15',
        next_calibration_date: '2026-09-15',
        status: 'OVERDUE',
        description: 'Double-beam spectrophotometer with Czerny-Turner monochromator for purity assays.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2025-09-15T11:00:00Z',
      },
      {
        id: 'eq-003',
        equipment_code: 'EQ-2024-003',
        name: 'Benchtop pH/Ion Meter SevenExcellence',
        category: 'Electrochemistry',
        manufacturer: 'Mettler Toledo',
        model_number: 'S470-Basic',
        serial_number: 'MT-94812304',
        location: 'Lab 1A - Wet Chemistry Station',
        department: 'Analytical Chemistry',
        purchase_date: '2023-11-05',
        calibration_interval_days: 90,
        last_calibration_date: '2026-07-20',
        next_calibration_date: '2026-10-20',
        status: 'DUE_SOON',
        description: 'Multi-parameter channel meter measuring pH, conductivity, and ISE values.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-07-20T09:15:00Z',
      },
      {
        id: 'eq-004',
        equipment_code: 'EQ-2024-004',
        name: 'Refrigerated Microcentrifuge',
        category: 'Centrifuges',
        manufacturer: 'Eppendorf',
        model_number: '5424 R',
        serial_number: 'EPP-8837190',
        location: 'Lab 4B - Prep Area',
        department: 'Bioassay',
        purchase_date: '2022-02-14',
        calibration_interval_days: 365,
        last_calibration_date: '2026-01-18',
        next_calibration_date: '2027-01-18',
        status: 'CALIBRATED',
        description: 'High-speed 24-place microcentrifuge with temperature control range -10°C to +40°C.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-01-18T16:00:00Z',
      },
      {
        id: 'eq-005',
        equipment_code: 'EQ-2024-005',
        name: 'Temperature & Humidity Data Logger',
        category: 'Thermal & Environmental',
        manufacturer: 'Vaisala',
        model_number: 'HMP110 / Veriteq',
        serial_number: 'VAI-2049182',
        location: 'Stability Chamber Room 01',
        department: 'Quality Control',
        purchase_date: '2024-01-10',
        calibration_interval_days: 365,
        last_calibration_date: '2025-08-30',
        next_calibration_date: '2026-08-30',
        status: 'OVERDUE',
        description: 'Continuous monitoring sensor for long-term ICH stability storage conditions.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2025-08-30T10:00:00Z',
      },
      {
        id: 'eq-006',
        equipment_code: 'EQ-2024-006',
        name: 'High Performance Liquid Chromatograph (HPLC)',
        category: 'Chromatography',
        manufacturer: 'Agilent Technologies',
        model_number: '1260 Infinity II Quaternary',
        serial_number: 'AGL-DE9182741',
        location: 'Lab 2A - Chromatography Suite',
        department: 'Analytical Chemistry',
        purchase_date: '2021-06-12',
        calibration_interval_days: 180,
        last_calibration_date: '2026-05-14',
        next_calibration_date: '2026-11-14',
        status: 'CALIBRATED',
        description: 'Quaternary LC system with DAD detector and thermostatted column compartment.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-05-14T11:45:00Z',
      },
      {
        id: 'eq-007',
        equipment_code: 'EQ-2024-007',
        name: 'Precision Top-Loading Balance',
        category: 'Balances & Scales',
        manufacturer: 'Sartorius',
        model_number: 'Entris II BCE6202I-1S',
        serial_number: 'SAR-77391024',
        location: 'Lab 3A - Weighing Booth 01',
        department: 'R&D Formulation',
        purchase_date: '2023-05-22',
        calibration_interval_days: 180,
        last_calibration_date: '2026-04-18',
        next_calibration_date: '2026-10-18',
        status: 'DUE_SOON',
        description: 'High-capacity 6.2 kg top loader for excipient preparation and bulk batch weighings.',
        created_by: 'usr-tech-02',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-04-18T13:00:00Z',
      },
      {
        id: 'eq-008',
        equipment_code: 'EQ-2024-008',
        name: 'Autoclave Vertical Steam Sterilizer',
        category: 'Sterilization',
        manufacturer: 'Tuttnauer',
        model_number: '3870ELV-D',
        serial_number: 'TUT-1049281',
        location: 'Lab 4A - Sterilization Suite',
        department: 'Microbiology',
        purchase_date: '2022-10-30',
        calibration_interval_days: 180,
        last_calibration_date: '2026-06-02',
        next_calibration_date: '2026-12-02',
        status: 'CALIBRATED',
        description: 'High-capacity vertical autoclave with internal water cooling and exhaust filtration.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-06-02T10:30:00Z',
      },
      {
        id: 'eq-009',
        equipment_code: 'EQ-2024-009',
        name: 'Class II Type A2 Biosafety Cabinet',
        category: 'Thermal & Environmental',
        manufacturer: 'Labconco',
        model_number: 'Purifier Logic+ 4ft',
        serial_number: 'LBC-4481920',
        location: 'Lab 4A - Cell Culture Room',
        department: 'Microbiology',
        purchase_date: '2023-01-18',
        calibration_interval_days: 365,
        last_calibration_date: '2025-07-11',
        next_calibration_date: '2026-07-11',
        status: 'OVERDUE',
        description: 'Biosafety cabinet certified for HEPA laminar airflow and operator protection.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2025-07-11T14:00:00Z',
      },
      {
        id: 'eq-010',
        equipment_code: 'EQ-2024-010',
        name: 'Multi-Channel Pipette 8-Ch (20-200 uL)',
        category: 'Balances & Scales',
        manufacturer: 'Gilson',
        model_number: 'Pipetman L P8x200L',
        serial_number: 'GIL-8820491',
        location: 'Lab 4B - Assay Bench 1',
        department: 'Bioassay',
        purchase_date: '2024-02-11',
        calibration_interval_days: 90,
        last_calibration_date: '2026-07-15',
        next_calibration_date: '2026-10-15',
        status: 'DUE_SOON',
        description: 'Mechanical multichannel pipette for high-throughput 96-well ELISA assays.',
        created_by: 'usr-tech-02',
        created_at: '2024-02-15T10:00:00Z',
        updated_at: '2026-07-15T15:00:00Z',
      },
      {
        id: 'eq-011',
        equipment_code: 'EQ-2024-011',
        name: 'FTIR Spectrometer Frontier',
        category: 'Spectroscopy',
        manufacturer: 'PerkinElmer',
        model_number: 'Frontier MIR/NIR',
        serial_number: 'PE-9948210',
        location: 'Lab 2C - ID Testing Lab',
        department: 'Quality Control',
        purchase_date: '2021-09-08',
        calibration_interval_days: 365,
        last_calibration_date: '2026-02-12',
        next_calibration_date: '2027-02-12',
        status: 'CALIBRATED',
        description: 'Fourier transform infrared spectrometer equipped with ATR diamond crystal.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-02-12T11:00:00Z',
      },
      {
        id: 'eq-012',
        equipment_code: 'EQ-2024-012',
        name: 'Ultra-Low Temperature Freezer (-86°C)',
        category: 'Thermal & Environmental',
        manufacturer: 'Thermo Scientific',
        model_number: 'TSX Series TSX60086A',
        serial_number: 'TS-3329104',
        location: 'Bio-Repository Room G-12',
        department: 'Bioassay',
        purchase_date: '2022-04-19',
        calibration_interval_days: 180,
        last_calibration_date: '2026-06-25',
        next_calibration_date: '2026-12-25',
        status: 'CALIBRATED',
        description: 'Energy-efficient -86°C sample storage freezer with dual cascade refrigeration.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-06-25T08:30:00Z',
      },
      {
        id: 'eq-013',
        equipment_code: 'EQ-2024-013',
        name: 'Karl Fischer Coulometric Titrator',
        category: 'Electrochemistry',
        manufacturer: 'Metrohm',
        model_number: '899 Coulometer',
        serial_number: 'MET-5519208',
        location: 'Lab 1A - Moisture Testing Unit',
        department: 'Analytical Chemistry',
        purchase_date: '2023-07-14',
        calibration_interval_days: 180,
        last_calibration_date: '2026-04-29',
        next_calibration_date: '2026-10-29',
        status: 'DUE_SOON',
        description: 'Compact coulometric titrator for determining water trace levels from 10 ug to 10 mg.',
        created_by: 'usr-tech-02',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-04-29T10:00:00Z',
      },
      {
        id: 'eq-014',
        equipment_code: 'EQ-2024-014',
        name: 'Gas Chromatograph Mass Spectrometer (GC-MS)',
        category: 'Chromatography',
        manufacturer: 'Thermo Scientific',
        model_number: 'ISQ 7000 Single Quadrupole',
        serial_number: 'TS-8821940',
        location: 'Lab 2B - Volatiles Testing',
        department: 'Quality Control',
        purchase_date: '2021-11-20',
        calibration_interval_days: 180,
        last_calibration_date: '2026-05-02',
        next_calibration_date: '2026-11-02',
        status: 'CALIBRATED',
        description: 'GC-MS with ExtractaBrite ion source for residual solvent qualification.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-05-02T13:30:00Z',
      },
      {
        id: 'eq-015',
        equipment_code: 'EQ-2024-015',
        name: 'Digital Differential Pressure Gauge',
        category: 'Thermal & Environmental',
        manufacturer: 'Dwyer Instruments',
        model_number: 'Magnehelic Series 2000-00',
        serial_number: 'DWY-901824',
        location: 'Cleanroom Airlock 01',
        department: 'Quality Control',
        purchase_date: '2024-03-01',
        calibration_interval_days: 365,
        last_calibration_date: '2026-03-01',
        next_calibration_date: '2027-03-01',
        status: 'CALIBRATED',
        description: 'Differential pressure transmitter guarding cleanroom cascade envelope (15 Pa diff).',
        created_by: 'usr-admin-01',
        created_at: '2024-03-05T10:00:00Z',
        updated_at: '2026-03-01T11:00:00Z',
      },
    ];

    // 20 Calibration Records
    this.calibrationRecords = [
      {
        id: 'rec-001',
        equipment_id: 'eq-001',
        calibration_date: '2026-04-10',
        next_due_date: '2026-10-10',
        performed_by: 'Alan Croft, Senior Metrologist',
        calibration_provider: 'Metrology Global Solutions ISO 17025',
        certificate_number: 'CERT-CAL-2026-4491',
        result: 'PASSED',
        remarks: 'Corner load, repeatability, and linearity confirmed within ±0.0001 g.',
        certificate_file_path: '/certificates/CERT-CAL-2026-4491.pdf',
        created_by: 'usr-admin-01',
        created_at: '2026-04-10T14:30:00Z',
      },
      {
        id: 'rec-002',
        equipment_id: 'eq-001',
        calibration_date: '2025-10-12',
        next_due_date: '2026-04-10',
        performed_by: 'Alan Croft',
        calibration_provider: 'Metrology Global Solutions ISO 17025',
        certificate_number: 'CERT-CAL-2025-3312',
        result: 'PASSED',
        remarks: 'Semi-annual calibration check passed.',
        certificate_file_path: '/certificates/CERT-CAL-2025-3312.pdf',
        created_by: 'usr-admin-01',
        created_at: '2025-10-12T11:00:00Z',
      },
      {
        id: 'rec-003',
        equipment_id: 'eq-002',
        calibration_date: '2025-09-15',
        next_due_date: '2026-09-15',
        performed_by: 'Takeshi Yamada',
        calibration_provider: 'Shimadzu Metrology Services',
        certificate_number: 'CERT-CAL-2025-9921',
        result: 'PASSED',
        remarks: 'Deuterium and Tungsten lamp intensities certified. Annual cycle expired Sept 15, 2026.',
        certificate_file_path: '/certificates/CERT-CAL-2025-9921.pdf',
        created_by: 'usr-admin-01',
        created_at: '2025-09-15T11:00:00Z',
      },
      {
        id: 'rec-004',
        equipment_id: 'eq-003',
        calibration_date: '2026-07-20',
        next_due_date: '2026-10-20',
        performed_by: 'Claire Hughes',
        calibration_provider: 'Precision Lab Services Inc.',
        certificate_number: 'CERT-CAL-2026-7819',
        result: 'PASSED',
        remarks: 'Electrode slope 98.7%, offset -2.1 mV. Electrolyte refilled.',
        certificate_file_path: '/certificates/CERT-CAL-2026-7819.pdf',
        created_by: 'usr-tech-02',
        created_at: '2026-07-20T09:15:00Z',
      },
      {
        id: 'rec-005',
        equipment_id: 'eq-003',
        calibration_date: '2026-04-19',
        next_due_date: '2026-07-20',
        performed_by: 'Claire Hughes',
        calibration_provider: 'Precision Lab Services Inc.',
        certificate_number: 'CERT-CAL-2026-2104',
        result: 'PASSED',
        remarks: 'Quarterly sensor calibration within tolerance limits.',
        certificate_file_path: '/certificates/CERT-CAL-2026-2104.pdf',
        created_by: 'usr-tech-02',
        created_at: '2026-04-19T10:00:00Z',
      },
      {
        id: 'rec-006',
        equipment_id: 'eq-004',
        calibration_date: '2026-01-18',
        next_due_date: '2027-01-18',
        performed_by: 'George Henderson',
        calibration_provider: 'CentriTech Certification Ltd.',
        certificate_number: 'CERT-CAL-2026-1102',
        result: 'PASSED',
        remarks: 'Speed verified at 3,000, 8,000, 14,000 RPM. Temperature setpoint 4°C measured 3.8°C.',
        certificate_file_path: '/certificates/CERT-CAL-2026-1102.pdf',
        created_by: 'usr-admin-01',
        created_at: '2026-01-18T16:00:00Z',
      },
      {
        id: 'rec-007',
        equipment_id: 'eq-005',
        calibration_date: '2025-08-30',
        next_due_date: '2026-08-30',
        performed_by: 'Nils Lindqvist',
        calibration_provider: 'Vaisala Field Services',
        certificate_number: 'CERT-CAL-2025-8831',
        result: 'PASSED',
        remarks: 'Primary chilled mirror hygrometer comparison. Passed temperature and relative humidity.',
        certificate_file_path: '/certificates/CERT-CAL-2025-8831.pdf',
        created_by: 'usr-admin-01',
        created_at: '2025-08-30T10:00:00Z',
      },
      {
        id: 'rec-008',
        equipment_id: 'eq-006',
        calibration_date: '2026-05-14',
        next_due_date: '2026-11-14',
        performed_by: 'Karen Peterson',
        calibration_provider: 'Agilent Direct Field Service',
        certificate_number: 'CERT-CAL-2026-5521',
        result: 'CONDITIONAL',
        remarks: 'Purge valve frit replaced, proportioning valve seal serviced. Gradient linearity confirmed.',
        certificate_file_path: '/certificates/CERT-CAL-2026-5521.pdf',
        created_by: 'usr-admin-01',
        created_at: '2026-05-14T11:45:00Z',
      },
      {
        id: 'rec-009',
        equipment_id: 'eq-006',
        calibration_date: '2025-11-15',
        next_due_date: '2026-05-14',
        performed_by: 'Karen Peterson',
        calibration_provider: 'Agilent Direct Field Service',
        certificate_number: 'CERT-CAL-2025-4412',
        result: 'PASSED',
        remarks: 'Flow accuracy verified at 1.0 mL/min and 2.0 mL/min.',
        certificate_file_path: '/certificates/CERT-CAL-2025-4412.pdf',
        created_by: 'usr-admin-01',
        created_at: '2025-11-15T15:00:00Z',
      },
      {
        id: 'rec-010',
        equipment_id: 'eq-007',
        calibration_date: '2026-04-18',
        next_due_date: '2026-10-18',
        performed_by: 'Kenji Sato',
        calibration_provider: 'Sartorius Field Metrology',
        certificate_number: 'CERT-CAL-2026-7731',
        result: 'PASSED',
        remarks: 'OIML Class F1 mass weights used. Eccentricity and sensitivity verified.',
        certificate_file_path: '/certificates/CERT-CAL-2026-7731.pdf',
        created_by: 'usr-tech-02',
        created_at: '2026-04-18T13:00:00Z',
      },
      {
        id: 'rec-011',
        equipment_id: 'eq-008',
        calibration_date: '2026-06-02',
        next_due_date: '2026-12-02',
        performed_by: 'Brian Miller',
        calibration_provider: 'SteriQual Metrology',
        certificate_number: 'CERT-CAL-2026-6638',
        result: 'PASSED',
        remarks: '121°C and 134°C sterilization cycles mapped with 6 thermocouples. Door gasket verified.',
        certificate_file_path: '/certificates/CERT-CAL-2026-6638.pdf',
        created_by: 'usr-admin-01',
        created_at: '2026-06-02T10:30:00Z',
      },
      {
        id: 'rec-012',
        equipment_id: 'eq-009',
        calibration_date: '2025-07-11',
        next_due_date: '2026-07-11',
        performed_by: 'David Miller',
        calibration_provider: 'Clean Air Solutions Ltd.',
        certificate_number: 'CERT-CAL-2025-3391',
        result: 'FAILED',
        remarks: 'Downflow velocity was 48 fpm (tolerance minimum 55 fpm). Motor speed tuned, pending retest.',
        certificate_file_path: '/certificates/CERT-CAL-2025-3391.pdf',
        created_by: 'usr-admin-01',
        created_at: '2025-07-11T14:00:00Z',
      },
      {
        id: 'rec-013',
        equipment_id: 'eq-010',
        calibration_date: '2026-07-15',
        next_due_date: '2026-10-15',
        performed_by: 'Jessica Bell',
        calibration_provider: 'Pipette Calibration Direct',
        certificate_number: 'CERT-CAL-2026-7734',
        result: 'PASSED',
        remarks: 'All 8 channels within ISO 8655 tolerances at 20 uL, 100 uL, and 200 uL.',
        certificate_file_path: '/certificates/CERT-CAL-2026-7734.pdf',
        created_by: 'usr-tech-02',
        created_at: '2026-07-15T15:00:00Z',
      },
      {
        id: 'rec-014',
        equipment_id: 'eq-010',
        calibration_date: '2026-04-14',
        next_due_date: '2026-07-15',
        performed_by: 'Jessica Bell',
        calibration_provider: 'Pipette Calibration Direct',
        certificate_number: 'CERT-CAL-2026-3819',
        result: 'PASSED',
        remarks: 'Seal rings lubricated. Passed gravimetric run.',
        certificate_file_path: '/certificates/CERT-CAL-2026-3819.pdf',
        created_by: 'usr-tech-02',
        created_at: '2026-04-14T11:00:00Z',
      },
      {
        id: 'rec-015',
        equipment_id: 'eq-011',
        calibration_date: '2026-02-12',
        next_due_date: '2027-02-12',
        performed_by: 'Nathan Cole',
        calibration_provider: 'PerkinElmer Metrology Group',
        certificate_number: 'CERT-CAL-2026-2291',
        result: 'PASSED',
        remarks: 'Wavelength calibration and photometric repeatability passed with NIST SRM 1921b.',
        certificate_file_path: '/certificates/CERT-CAL-2026-2291.pdf',
        created_by: 'usr-admin-01',
        created_at: '2026-02-12T11:00:00Z',
      },
      {
        id: 'rec-016',
        equipment_id: 'eq-012',
        calibration_date: '2026-06-25',
        next_due_date: '2026-12-25',
        performed_by: 'Elena Rostova',
        calibration_provider: 'ColdTech Cryo Metrology',
        certificate_number: 'CERT-CAL-2026-6619',
        result: 'PASSED',
        remarks: 'Multi-point RTD mapping across 4 storage shelves.',
        certificate_file_path: '/certificates/CERT-CAL-2026-6619.pdf',
        created_by: 'usr-admin-01',
        created_at: '2026-06-25T08:30:00Z',
      },
      {
        id: 'rec-017',
        equipment_id: 'eq-013',
        calibration_date: '2026-04-29',
        next_due_date: '2026-10-29',
        performed_by: 'Dr. Sarah Lin',
        calibration_provider: 'Metrohm Certified Field Service',
        certificate_number: 'CERT-CAL-2026-4418',
        result: 'PASSED',
        remarks: 'Hydranal 1.00 mg/g standard checked with 99.4% recovery.',
        certificate_file_path: '/certificates/CERT-CAL-2026-4418.pdf',
        created_by: 'usr-tech-02',
        created_at: '2026-04-29T10:00:00Z',
      },
      {
        id: 'rec-018',
        equipment_id: 'eq-014',
        calibration_date: '2026-05-02',
        next_due_date: '2026-11-02',
        performed_by: 'Marcus Vance',
        calibration_provider: 'Thermo Scientific Field Service',
        certificate_number: 'CERT-CAL-2026-5509',
        result: 'PASSED',
        remarks: 'DFTPP tune verified, mass resolution 0.7 Da.',
        certificate_file_path: '/certificates/CERT-CAL-2026-5509.pdf',
        created_by: 'usr-admin-01',
        created_at: '2026-05-02T13:30:00Z',
      },
      {
        id: 'rec-019',
        equipment_id: 'eq-015',
        calibration_date: '2026-03-01',
        next_due_date: '2027-03-01',
        performed_by: 'Dwyer Technical Field Team',
        calibration_provider: 'Dwyer Metrology Lab',
        certificate_number: 'CERT-CAL-2026-3301',
        result: 'PASSED',
        remarks: 'Furness micromanometer calibration standard. Accurate to ±0.5 Pa.',
        certificate_file_path: '/certificates/CERT-CAL-2026-3301.pdf',
        created_by: 'usr-admin-01',
        created_at: '2026-03-01T11:00:00Z',
      },
      {
        id: 'rec-020',
        equipment_id: 'eq-004',
        calibration_date: '2025-01-20',
        next_due_date: '2026-01-18',
        performed_by: 'George Henderson',
        calibration_provider: 'CentriTech Certification Ltd.',
        certificate_number: 'CERT-CAL-2025-1100',
        result: 'PASSED',
        remarks: 'Previous annual audit cycle successfully logged.',
        certificate_file_path: '/certificates/CERT-CAL-2025-1100.pdf',
        created_by: 'usr-admin-01',
        created_at: '2025-01-20T10:00:00Z',
      },
    ];

    // Notifications
    this.notifications = [
      {
        id: 'notif-001',
        user_id: 'usr-admin-01',
        equipment_id: 'eq-002',
        type: 'CALIBRATION_OVERDUE',
        title: 'Equipment Calibration Overdue',
        message: 'UV-Visible Spectrophotometer (EQ-2024-002) is overdue by 23 days. Immediate service dispatch required.',
        is_read: false,
        created_at: '2026-10-08T08:00:00Z',
      },
      {
        id: 'notif-002',
        user_id: 'usr-admin-01',
        equipment_id: 'eq-001',
        type: 'CALIBRATION_DUE_SOON',
        title: 'Calibration Due in 2 Days',
        message: 'Analytical Balance XPR205 (EQ-2024-001) in Lab 1A requires calibration on Oct 10, 2026.',
        is_read: false,
        created_at: '2026-10-08T05:00:00Z',
      },
      {
        id: 'notif-003',
        user_id: 'usr-admin-01',
        equipment_id: 'eq-009',
        type: 'CALIBRATION_OVERDUE',
        title: 'Critical Out-of-Tolerance Alert',
        message: 'Class II Biosafety Cabinet (EQ-2024-009) airflow certification overdue. Cleanroom quarantine notice issued.',
        is_read: false,
        created_at: '2026-10-07T10:00:00Z',
      },
      {
        id: 'notif-004',
        user_id: 'usr-admin-01',
        equipment_id: 'eq-003',
        type: 'CALIBRATION_COMPLETED',
        title: 'Calibration Record Approved',
        message: 'Certificate CERT-CAL-2026-7819 for Benchtop pH Meter (EQ-2024-003) approved by QA Metrology Lead.',
        is_read: true,
        created_at: '2026-10-06T14:00:00Z',
      },
      {
        id: 'notif-005',
        user_id: 'usr-admin-01',
        equipment_id: null,
        type: 'SYSTEM',
        title: 'System Audit Trail Synchronized',
        message: 'Monthly ISO 17025 compliance log archived. 15 active instruments cataloged in registry.',
        is_read: true,
        created_at: '2026-10-05T09:00:00Z',
      },
    ];

    // Reminder Settings
    this.reminderSettings = [
      {
        id: 'rem-settings-01',
        reminder_days_before: 7,
        email_enabled: true,
        in_app_enabled: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ];
  }
}

export const memoryStore = new MemoryStore();

// =====================================================================
// MySQL Connection Pool Initialization & Validation
// =====================================================================
function getMySQLConfig() {
  const rawUrl = process.env.MYSQL_DATABASE_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;

  // Validate if a valid MySQL URL is configured (must start with mysql:// and not contain template placeholders)
  if (rawUrl) {
    const isMysqlUrl = rawUrl.startsWith('mysql://') || rawUrl.startsWith('mysql2://');
    const hasPlaceholder =
      rawUrl.includes('[') ||
      rawUrl.includes('YOUR-PASSWORD') ||
      rawUrl.includes('YOUR_PASSWORD') ||
      rawUrl.includes('MY_PASSWORD');

    if (isMysqlUrl && !hasPlaceholder) {
      return { type: 'url' as const, uri: rawUrl };
    }
  }

  // Check discrete host/user/password variables
  // Avoid picking up non-MySQL hosts (like PostgreSQL or Supabase poolers)
  const host =
    process.env.MYSQL_HOST ||
    (process.env.DB_HOST &&
    !process.env.DB_HOST.includes('supabase') &&
    !process.env.DB_HOST.includes('postgres')
      ? process.env.DB_HOST
      : undefined);

  const user =
    process.env.MYSQL_USER ||
    (process.env.DB_USER && !process.env.DB_USER.startsWith('postgres')
      ? process.env.DB_USER
      : undefined);

  const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD;
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'calibtrack';
  const port = parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306', 10);

  const hasPlaceholderPassword =
    password &&
    (password.includes('[') ||
      password.includes('YOUR-PASSWORD') ||
      password.includes('YOUR_PASSWORD'));

  if (host && user && password && !hasPlaceholderPassword) {
    return { type: 'params' as const, host, user, password, database, port };
  }

  return null;
}

export async function initDatabase(): Promise<DbStatus> {
  const mysqlConfig = getMySQLConfig();

  if (!mysqlConfig) {
    isUsingFallback = true;
    dbStatus = {
      connected: true,
      type: 'memory-fallback',
      message: 'Operating with persistent laboratory data store. (To connect an external MySQL instance, set a valid mysql:// DATABASE_URL in .env)',
      databaseName: 'calibtrack_store',
    };
    console.log(`[Database] ${dbStatus.message}`);
    return dbStatus;
  }

  try {
    const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10);
    const poolConfig: PoolOptions =
      mysqlConfig.type === 'url'
        ? { uri: mysqlConfig.uri, connectionLimit, waitForConnections: true, connectTimeout: 3000 }
        : {
            host: mysqlConfig.host,
            port: mysqlConfig.port,
            user: mysqlConfig.user,
            password: mysqlConfig.password,
            database: mysqlConfig.database,
            connectionLimit,
            waitForConnections: true,
            connectTimeout: 3000,
          };

    pool = mysql.createPool(poolConfig);

    // Test ping
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    isUsingFallback = false;
    dbStatus = {
      connected: true,
      type: 'mysql',
      message: 'Successfully connected to MySQL database pool',
      databaseName: mysqlConfig.type === 'params' ? mysqlConfig.database : 'calibtrack',
    };
    console.log(`[Database] Connected to live MySQL database (${dbStatus.databaseName})`);
    return dbStatus;
  } catch (error: any) {
    isUsingFallback = true;
    dbStatus = {
      connected: true,
      type: 'memory-fallback',
      message: `Operating with persistent laboratory data store (MySQL host unreachable: ${error.code || error.message})`,
      databaseName: 'calibtrack_store',
    };
    console.log(`[Database] ${dbStatus.message}`);
    return dbStatus;
  }
}

export function getDatabaseStatus(): DbStatus {
  return dbStatus;
}

export function getPool(): Pool | null {
  return pool;
}

export function isFallback(): boolean {
  return isUsingFallback;
}
