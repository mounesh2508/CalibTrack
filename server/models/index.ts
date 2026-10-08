export type UserRole = 'ADMIN' | 'TECHNICIAN';

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type DbEquipmentStatus = 'CALIBRATED' | 'DUE_SOON' | 'OVERDUE';

export interface EquipmentEntity {
  id: string;
  equipment_code: string;
  name: string;
  category: string;
  manufacturer: string | null;
  model_number: string | null;
  serial_number: string | null;
  location: string | null;
  department: string | null;
  purchase_date: string | null;
  calibration_interval_days: number;
  last_calibration_date: string | null;
  next_calibration_date: string | null;
  status: DbEquipmentStatus;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DbCalibrationResult = 'PASSED' | 'FAILED' | 'CONDITIONAL';

export interface CalibrationRecordEntity {
  id: string;
  equipment_id: string;
  calibration_date: string;
  next_due_date: string;
  performed_by: string | null;
  calibration_provider: string | null;
  certificate_number: string | null;
  result: DbCalibrationResult;
  remarks: string | null;
  certificate_file_path: string | null;
  created_by: string | null;
  created_at: string;
}

export type DbNotificationType =
  | 'CALIBRATION_DUE_SOON'
  | 'CALIBRATION_OVERDUE'
  | 'CALIBRATION_COMPLETED'
  | 'SYSTEM';

export interface NotificationEntity {
  id: string;
  user_id: string | null;
  equipment_id: string | null;
  type: DbNotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface ReminderSettingsEntity {
  id: string;
  reminder_days_before: number;
  email_enabled: boolean;
  in_app_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  totalEquipment: number;
  calibratedCount: number;
  dueSoonCount: number;
  overdueCount: number;
  recentCalibrationRecords: CalibrationRecordEntity[];
  upcomingCalibrationRecords: Array<{
    equipmentId: string;
    equipmentCode: string;
    equipmentName: string;
    category: string;
    nextCalibrationDate: string;
    daysRemaining: number;
    status: DbEquipmentStatus;
  }>;
}
