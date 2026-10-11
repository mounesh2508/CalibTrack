export type EquipmentStatus = 'calibrated' | 'due_soon' | 'overdue' | 'maintenance' | 'out_of_service';

export type CalibrationResult = 'Passed' | 'Passed with Adjustment' | 'Failed' | 'Limited Use';

export interface Equipment {
  id: string;
  code: string;
  name: string;
  category: 'Balances & Scales' | 'Spectroscopy' | 'Centrifuges' | 'Electrochemistry' | 'Thermal & Environmental' | 'Chromatography' | 'Sterilization';
  manufacturer: string;
  model: string;
  serialNumber: string;
  department: 'Analytical Chemistry' | 'Microbiology' | 'Quality Control' | 'R&D Formulation' | 'Bioassay';
  location: string; // e.g. "Lab 3B - Bench 4"
  purchaseDate: string;
  calibrationIntervalMonths: number;
  lastCalibrationDate: string;
  nextCalibrationDate: string;
  daysRemaining: number;
  status: EquipmentStatus;
  assignedTechnician: string;
  description?: string;
  tolerance?: string;
  calibrationStandard?: string;
}

export interface CalibrationRecord {
  id: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  calibrationDate: string;
  nextDueDate: string;
  serviceProvider: string;
  technicianName: string;
  certificateNumber: string;
  result: CalibrationResult;
  standardUsed: string;
  environmentalTemp: string;
  environmentalHumidity: string;
  remarks: string;
  status: 'Completed' | 'Scheduled' | 'In Progress' | 'Overdue';
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'alert' | 'system' | 'reminder' | 'success';
  read: boolean;
  equipmentId?: string;
  actionUrl?: string;
}

export interface RecentActivity {
  id: string;
  type: 'calibration_completed' | 'equipment_added' | 'due_reminder' | 'status_changed' | 'maintenance_scheduled';
  title: string;
  description: string;
  timestamp: string;
  actor: string;
  equipmentCode?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  equipmentId: string;
  equipmentCode: string;
  equipmentName: string;
  date: string; // YYYY-MM-DD
  type: 'upcoming' | 'due_soon' | 'overdue' | 'completed';
  provider: string;
  location: string;
  time?: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'TECHNICIAN';
  created_at?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt?: string;
}
