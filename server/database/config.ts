import mysql, { Pool as MySqlPool, PoolOptions as MySqlPoolOptions } from 'mysql2/promise';
import { Pool as PgPool, PoolConfig as PgPoolConfig } from 'pg';
import dotenv from 'dotenv';
import {
  EquipmentEntity,
  CalibrationRecordEntity,
  NotificationEntity,
  ReminderSettingsEntity,
  User,
  VerificationOtp,
} from '../models';

dotenv.config();

export interface UniversalPool {
  query<T = any>(sql: string, params?: any[]): Promise<[T, any]>;
  execute?<T = any>(sql: string, params?: any[]): Promise<[T, any]>;
  getConnection?(): Promise<any>;
}

export interface DbStatus {
  connected: boolean;
  type: 'mysql' | 'postgres' | 'memory-fallback';
  message: string;
  databaseName?: string;
}

let pool: any = null;
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
  otps: VerificationOtp[] = [];

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    // 2 Users
    this.users = [
      {
        id: 'usr-admin-01',
        name: 'Mounesh A',
        email: 'asokanmounesh@gmail.com',
        password_hash: 'a.MOUNESH14',
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

    // Dynamic relative date helpers so equipment never expires into all-overdue on Vercel deployments
    const nowMs = Date.now();
    const daysAgo = (days: number) => new Date(nowMs - days * 86400000).toISOString().split('T')[0];
    const daysFromNow = (days: number) => new Date(nowMs + days * 86400000).toISOString().split('T')[0];

    // 15 Equipment items with realistic laboratory names and states
    this.equipment = [
      {
        id: 'eq-001',
        equipment_code: 'EQ-2024-001',
        name: 'Analytical Balance XPR205',
        category: 'Measurement & Metrology',
        manufacturer: 'Mettler Toledo',
        model_number: 'XPR205 DualRange',
        serial_number: 'MT-88492019',
        location: 'Physics Lab - Bench 02',
        department: 'Physics Lab',
        purchase_date: daysAgo(400),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(30),
        next_calibration_date: daysFromNow(150),
        status: 'CALIBRATED',
        description: 'Precision 5-decimal analytical balance used for reference standard weighings.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-04-10T14:30:00Z',
      },
      {
        id: 'eq-002',
        equipment_code: 'EQ-2024-002',
        name: 'UV-Visible Spectrophotometer',
        category: 'Optical Instruments',
        manufacturer: 'Shimadzu',
        model_number: 'UV-2600i Double Beam',
        serial_number: 'SH-551042-JP',
        location: 'Physics Lab - Optics Room 3',
        department: 'Physics Lab',
        purchase_date: daysAgo(600),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(165),
        next_calibration_date: daysFromNow(15),
        status: 'DUE_SOON',
        description: 'Double-beam spectrophotometer with Czerny-Turner monochromator for optical experiments.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2025-09-15T11:00:00Z',
      },
      {
        id: 'eq-003',
        equipment_code: 'EQ-2024-003',
        name: 'Benchtop pH/Ion Meter SevenExcellence',
        category: 'Chemical & Glassware Apparatus',
        manufacturer: 'Mettler Toledo',
        model_number: 'S470-Basic',
        serial_number: 'MT-94812304',
        location: 'Chemistry Lab - Station 04',
        department: 'Chemistry Lab',
        purchase_date: daysAgo(350),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(45),
        next_calibration_date: daysFromNow(135),
        status: 'CALIBRATED',
        description: 'Multi-parameter channel meter measuring pH, conductivity, and ISE values.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-07-20T09:15:00Z',
      },
      {
        id: 'eq-004',
        equipment_code: 'EQ-2024-004',
        name: 'Refrigerated Microcentrifuge',
        category: 'Biological & Specimen Equipment',
        manufacturer: 'Eppendorf',
        model_number: '5424 R',
        serial_number: 'EPP-8837190',
        location: 'Biology Lab - Prep Area',
        department: 'Biology Lab',
        purchase_date: daysAgo(500),
        calibration_interval_days: 365,
        last_calibration_date: daysAgo(60),
        next_calibration_date: daysFromNow(305),
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
        category: 'Thermal & Heating',
        manufacturer: 'Vaisala',
        model_number: 'HMP110 / Veriteq',
        serial_number: 'VAI-2049182',
        location: 'Physics Lab - Thermal Suite',
        department: 'Physics Lab',
        purchase_date: daysAgo(400),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(220),
        next_calibration_date: daysAgo(40),
        status: 'OVERDUE',
        description: 'Continuous monitoring sensor for environmental temperature and humidity conditions.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2025-08-30T10:00:00Z',
      },
      {
        id: 'eq-006',
        equipment_code: 'EQ-2024-006',
        name: 'High Performance Liquid Chromatograph (HPLC)',
        category: 'Chemical & Glassware Apparatus',
        manufacturer: 'Agilent Technologies',
        model_number: '1260 Infinity II Quaternary',
        serial_number: 'AGL-DE9182741',
        location: 'Chemistry Lab - Chromatography Suite',
        department: 'Chemistry Lab',
        purchase_date: daysAgo(700),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(20),
        next_calibration_date: daysFromNow(160),
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
        category: 'Measurement & Metrology',
        manufacturer: 'Sartorius',
        model_number: 'Entris II BCE6202I-1S',
        serial_number: 'SAR-77391024',
        location: 'Physics Lab - Weighing Station',
        department: 'Physics Lab',
        purchase_date: daysAgo(300),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(170),
        next_calibration_date: daysFromNow(10),
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
        category: 'Safety & Sterilization',
        manufacturer: 'Tuttnauer',
        model_number: '3870ELV-D',
        serial_number: 'TUT-1049281',
        location: 'Biology Lab - Sterilization Area',
        department: 'Biology Lab',
        purchase_date: daysAgo(500),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(50),
        next_calibration_date: daysFromNow(130),
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
        category: 'Safety & Sterilization',
        manufacturer: 'Labconco',
        model_number: 'Purifier Logic+ 4ft',
        serial_number: 'LBC-4481920',
        location: 'Biology Lab - Cell Culture Room',
        department: 'Biology Lab',
        purchase_date: daysAgo(500),
        calibration_interval_days: 365,
        last_calibration_date: daysAgo(400),
        next_calibration_date: daysAgo(35),
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
        category: 'Chemical & Glassware Apparatus',
        manufacturer: 'Gilson',
        model_number: 'Pipetman L P8x200L',
        serial_number: 'GIL-8820491',
        location: 'Chemistry Lab - Titration Bench',
        department: 'Chemistry Lab',
        purchase_date: daysAgo(300),
        calibration_interval_days: 90,
        last_calibration_date: daysAgo(75),
        next_calibration_date: daysFromNow(15),
        status: 'DUE_SOON',
        description: 'Mechanical multichannel pipette for chemical sampling and solution dispensing.',
        created_by: 'usr-tech-02',
        created_at: '2024-02-15T10:00:00Z',
        updated_at: '2026-07-15T15:00:00Z',
      },
      {
        id: 'eq-011',
        equipment_code: 'EQ-2024-011',
        name: 'Digital Logic Analyzer & Microcontroller Kit',
        category: 'Computing & Robotics Hardware',
        manufacturer: 'Saleae',
        model_number: 'Logic Pro 16',
        serial_number: 'PE-9948210',
        location: 'Computer Science Lab - Bench 01',
        department: 'Computer Science Lab',
        purchase_date: daysAgo(500),
        calibration_interval_days: 365,
        last_calibration_date: daysAgo(90),
        next_calibration_date: daysFromNow(275),
        status: 'CALIBRATED',
        description: '16-channel digital logic analyzer with 500 MS/s sample rate for embedded systems.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-02-12T11:00:00Z',
      },
      {
        id: 'eq-012',
        equipment_code: 'EQ-2024-012',
        name: 'Digital Storage Oscilloscope 100MHz',
        category: 'Electrical & Electronics',
        manufacturer: 'Tektronix',
        model_number: 'TBS1102B',
        serial_number: 'TS-3329104',
        location: 'Computer Science Lab - Hardware Station',
        department: 'Computer Science Lab',
        purchase_date: daysAgo(400),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(40),
        next_calibration_date: daysFromNow(140),
        status: 'CALIBRATED',
        description: 'Dual-channel digital storage oscilloscope for waveform verification.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-06-25T08:30:00Z',
      },
      {
        id: 'eq-013',
        equipment_code: 'EQ-2024-013',
        name: 'Industrial Robotic Arm Controller',
        category: 'Computing & Robotics Hardware',
        manufacturer: 'Universal Robots',
        model_number: 'UR3e Controller',
        serial_number: 'MET-5519208',
        location: 'Engineering & Robotics Lab - Cell 1',
        department: 'Engineering & Robotics Lab',
        purchase_date: daysAgo(300),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(160),
        next_calibration_date: daysFromNow(20),
        status: 'DUE_SOON',
        description: 'Compact collaborative robotic manipulator controller for mechatronics.',
        created_by: 'usr-tech-02',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-04-29T10:00:00Z',
      },
      {
        id: 'eq-014',
        equipment_code: 'EQ-2024-014',
        name: 'Programmable DC Power Supply',
        category: 'Electrical & Electronics',
        manufacturer: 'Keysight Technologies',
        model_number: 'E36313A Triple Output',
        serial_number: 'TS-8821940',
        location: 'Engineering & Robotics Lab - Bench 04',
        department: 'Engineering & Robotics Lab',
        purchase_date: daysAgo(600),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(30),
        next_calibration_date: daysFromNow(150),
        status: 'CALIBRATED',
        description: 'Triple-output clean power supply with low noise and precision voltage control.',
        created_by: 'usr-admin-01',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: '2026-05-02T13:30:00Z',
      },
      {
        id: 'eq-015',
        equipment_code: 'EQ-2024-015',
        name: 'Digital Vernier Caliper & Micrometer',
        category: 'Measurement & Metrology',
        manufacturer: 'Mitutoyo',
        model_number: '500-196-30 AOS Absolute Digimatic',
        serial_number: 'DWY-901824',
        location: 'Physics Lab - Metrology Bench',
        department: 'Physics Lab',
        purchase_date: daysAgo(350),
        calibration_interval_days: 180,
        last_calibration_date: daysAgo(200),
        next_calibration_date: daysAgo(20),
        status: 'OVERDUE',
        description: 'Precision digital caliper 0-150 mm with 0.01 mm resolution.',
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

    // Enrich pre-seeded calibration records with corresponding equipment info
    this.calibrationRecords = this.calibrationRecords.map((r) => {
      const eq = this.equipment.find((e) => e.id === r.equipment_id);
      return {
        ...r,
        equipment_code: eq?.equipment_code || 'EQ-LOGGED',
        equipment_name: eq?.name || 'Laboratory Instrument',
        category: eq?.category || 'General',
        department: eq?.department || 'Laboratory',
        location: eq?.location || '',
      };
    });

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
// Database Configuration Detectors (PostgreSQL & MySQL)
// =====================================================================
function getPostgresConfig() {
  const rawUrl =
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.PGDATABASE_URL ||
    (process.env.DATABASE_URL &&
    (process.env.DATABASE_URL.startsWith('postgres://') ||
      process.env.DATABASE_URL.startsWith('postgresql://'))
      ? process.env.DATABASE_URL
      : undefined);

  if (rawUrl) {
    const hasPlaceholder =
      rawUrl.includes('[') ||
      rawUrl.includes('YOUR-PASSWORD') ||
      rawUrl.includes('YOUR_PASSWORD');
    if (!hasPlaceholder) {
      return { type: 'url' as const, uri: rawUrl };
    }
  }

  // Check discrete host/user/password variables for PostgreSQL
  const host = process.env.PGHOST || (process.env.DB_HOST && (process.env.DB_HOST.includes('supabase') || process.env.DB_HOST.includes('postgres') || process.env.DB_HOST.includes('neon')) ? process.env.DB_HOST : undefined);
  const user = process.env.PGUSER || (process.env.DB_USER && process.env.DB_USER.startsWith('postgres') ? process.env.DB_USER : undefined);
  const password = process.env.PGPASSWORD || process.env.DB_PASSWORD;
  const database = process.env.PGDATABASE || process.env.DB_NAME || 'calibtrack';
  const port = parseInt(process.env.PGPORT || '5432', 10);

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

function getMySQLConfig() {
  const rawUrl = process.env.MYSQL_DATABASE_URL || process.env.MYSQL_URL || (process.env.DATABASE_URL && (process.env.DATABASE_URL.startsWith('mysql://') || process.env.DATABASE_URL.startsWith('mysql2://')) ? process.env.DATABASE_URL : undefined);

  // Validate if a valid MySQL URL is configured
  if (rawUrl) {
    const hasPlaceholder =
      rawUrl.includes('[') ||
      rawUrl.includes('YOUR-PASSWORD') ||
      rawUrl.includes('YOUR_PASSWORD') ||
      rawUrl.includes('MY_PASSWORD');

    if (!hasPlaceholder) {
      return { type: 'url' as const, uri: rawUrl };
    }
  }

  // Check discrete host/user/password variables
  const host =
    process.env.MYSQL_HOST ||
    (process.env.DB_HOST &&
    !process.env.DB_HOST.includes('supabase') &&
    !process.env.DB_HOST.includes('postgres') &&
    !process.env.DB_HOST.includes('neon')
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
  const pgConfig = getPostgresConfig();
  const mysqlConfig = getMySQLConfig();

  // 1. Try PostgreSQL if configured
  if (pgConfig) {
    try {
      const max = parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10);
      const pgPoolConfig: PgPoolConfig =
        pgConfig.type === 'url'
          ? {
              connectionString: pgConfig.uri,
              max,
              connectionTimeoutMillis: 3500,
              ssl: pgConfig.uri.includes('localhost') ? false : { rejectUnauthorized: false },
            }
          : {
              host: pgConfig.host,
              port: pgConfig.port,
              user: pgConfig.user,
              password: pgConfig.password,
              database: pgConfig.database,
              max,
              connectionTimeoutMillis: 3500,
              ssl: pgConfig.host.includes('localhost') ? false : { rejectUnauthorized: false },
            };

      const pgPool = new PgPool(pgPoolConfig);
      await pgPool.query('SELECT 1');

      // Create compatibility adapter that translates '?' placeholders to '$1, $2, ...'
      pool = {
        async query(sql: string, params: any[] = []) {
          let idx = 1;
          const pgSql = sql.replace(/\?/g, () => `$${idx++}`);
          const res = await pgPool.query(pgSql, params);
          return [res.rows, res.fields];
        },
        async execute(sql: string, params: any[] = []) {
          return this.query(sql, params);
        },
        async getConnection() {
          const client = await pgPool.connect();
          return {
            async query(sql: string, params: any[] = []) {
              let idx = 1;
              const pgSql = sql.replace(/\?/g, () => `$${idx++}`);
              const res = await client.query(pgSql, params);
              return [res.rows, res.fields];
            },
            async ping() {
              await client.query('SELECT 1');
            },
            release() {
              client.release();
            },
          };
        },
      };

      isUsingFallback = false;
      dbStatus = {
        connected: true,
        type: 'postgres',
        message: 'Successfully connected to PostgreSQL database pool',
        databaseName: pgConfig.type === 'params' ? pgConfig.database : 'calibtrack',
      };
      console.log(`[Database] Connected to live PostgreSQL database (${dbStatus.databaseName})`);
      return dbStatus;
    } catch (pgError: any) {
      console.warn(`[Database] PostgreSQL connection failed: ${pgError.message}`);
    }
  }

  // 2. Try MySQL if configured
  if (mysqlConfig) {
    try {
      const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '5', 10);
      const poolConfig: MySqlPoolOptions =
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
    } catch (mysqlError: any) {
      console.warn(`[Database] MySQL connection failed: ${mysqlError.message}`);
    }
  }

  // 3. Resilient In-Memory Fallback
  isUsingFallback = true;
  dbStatus = {
    connected: true,
    type: 'memory-fallback',
    message: 'Operating with persistent laboratory data store. (To connect an external database, configure POSTGRES_URL or DATABASE_URL in Vercel)',
    databaseName: 'calibtrack_store',
  };
  console.log(`[Database] ${dbStatus.message}`);
  return dbStatus;
}

export function getDatabaseStatus(): DbStatus {
  return dbStatus;
}

export function getPool(): UniversalPool | any {
  return pool;
}

export function isFallback(): boolean {
  return isUsingFallback;
}
