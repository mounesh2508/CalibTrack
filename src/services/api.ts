import { Equipment, CalibrationRecord, NotificationItem } from '../types';
import { EquipmentEntity, CalibrationRecordEntity, NotificationEntity, DashboardSummary } from '../../server/models';

const API_BASE = '/api';

/**
 * Normalizes backend EquipmentEntity to the frontend Equipment interface
 */
export function mapBackendEquipmentToFrontend(entity: EquipmentEntity): Equipment {
  const nextDate = entity.next_calibration_date ? new Date(entity.next_calibration_date) : null;
  const daysRemaining = nextDate
    ? Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  let status: Equipment['status'] = 'calibrated';
  const dbStatus = entity.status ? entity.status.toLowerCase() : 'calibrated';
  if (dbStatus === 'overdue' || daysRemaining < 0) {
    status = 'overdue';
  } else if (dbStatus === 'due_soon' || daysRemaining <= 30) {
    status = 'due_soon';
  } else {
    status = 'calibrated';
  }

  return {
    id: entity.id,
    code: entity.equipment_code,
    name: entity.name,
    category: (entity.category as Equipment['category']) || 'Balances & Scales',
    manufacturer: entity.manufacturer || 'Standard Laboratory Equipment',
    model: entity.model_number || 'Model Standard',
    serialNumber: entity.serial_number || 'SN-UNASSIGNED',
    department: (entity.department as Equipment['department']) || 'Quality Control',
    location: entity.location || 'Central Laboratory',
    purchaseDate: entity.purchase_date || '2024-01-01',
    calibrationIntervalMonths: Math.round((entity.calibration_interval_days || 180) / 30),
    lastCalibrationDate: entity.last_calibration_date || '2026-01-01',
    nextCalibrationDate: entity.next_calibration_date || '2026-07-01',
    daysRemaining,
    status,
    assignedTechnician: 'Dr. Sarah Lin',
    description: entity.description || undefined,
  };
}

/**
 * Normalizes backend CalibrationRecordEntity to frontend CalibrationRecord
 */
export function mapBackendCalibrationToFrontend(
  entity: CalibrationRecordEntity,
  equipmentName = 'Laboratory Instrument',
  equipmentCode = 'EQ-ASSET'
): CalibrationRecord {
  let result: CalibrationRecord['result'] = 'Passed';
  if (entity.result === 'FAILED') result = 'Failed';
  else if (entity.result === 'CONDITIONAL') result = 'Passed with Adjustment';

  return {
    id: entity.id,
    equipmentId: entity.equipment_id,
    equipmentCode,
    equipmentName,
    calibrationDate: entity.calibration_date,
    nextDueDate: entity.next_due_date,
    serviceProvider: entity.calibration_provider || 'Certified Calibration Vendor',
    technicianName: entity.performed_by || 'Metrologist',
    certificateNumber: entity.certificate_number || `CERT-${entity.id}`,
    result,
    standardUsed: 'NIST Traceable Reference Standard',
    environmentalTemp: '20.5 °C',
    environmentalHumidity: '45 % RH',
    remarks: entity.remarks || 'Routine verification completed.',
    status: 'Completed',
  };
}

/**
 * API Service Client
 */
export const api = {
  // Health
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Health check failed');
    return res.json();
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`);
    if (!res.ok) throw new Error('Failed to fetch dashboard summary');
    const json = await res.json();
    return json.data;
  },

  // Equipment
  async getEquipmentList(filters?: {
    search?: string;
    category?: string;
    status?: string;
    department?: string;
  }): Promise<Equipment[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category && filters.category !== 'All') params.append('category', filters.category);
    if (filters?.status && filters.status !== 'All') params.append('status', filters.status);
    if (filters?.department && filters.department !== 'All') params.append('department', filters.department);

    const url = `${API_BASE}/equipment${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch equipment list');
    const json = await res.json();
    return (json.data as EquipmentEntity[]).map(mapBackendEquipmentToFrontend);
  },

  async getEquipmentById(id: string): Promise<Equipment> {
    const res = await fetch(`${API_BASE}/equipment/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch equipment #${id}`);
    const json = await res.json();
    return mapBackendEquipmentToFrontend(json.data as EquipmentEntity);
  },

  async createEquipment(data: {
    equipment_code: string;
    name: string;
    category: string;
    manufacturer?: string;
    model_number?: string;
    serial_number?: string;
    location?: string;
    department?: string;
    purchase_date?: string;
    calibration_interval_days: number;
    last_calibration_date?: string;
    description?: string;
  }): Promise<Equipment> {
    const res = await fetch(`${API_BASE}/equipment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create equipment');
    }

    const json = await res.json();
    return mapBackendEquipmentToFrontend(json.data as EquipmentEntity);
  },

  async updateEquipment(id: string, updates: Partial<EquipmentEntity>): Promise<Equipment> {
    const res = await fetch(`${API_BASE}/equipment/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update equipment');
    }

    const json = await res.json();
    return mapBackendEquipmentToFrontend(json.data as EquipmentEntity);
  },

  async deleteEquipment(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/equipment/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete equipment');
  },

  // Calibration Records
  async getCalibrationRecords(equipmentId?: string): Promise<CalibrationRecordEntity[]> {
    const url = equipmentId
      ? `${API_BASE}/equipment/${equipmentId}/calibration-records`
      : `${API_BASE}/calibration-records`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch calibration records');
    const json = await res.json();
    return json.data;
  },

  async createCalibrationRecord(data: {
    equipment_id: string;
    calibration_date: string;
    next_due_date?: string;
    performed_by?: string;
    calibration_provider?: string;
    certificate_number?: string;
    result?: 'PASSED' | 'FAILED' | 'CONDITIONAL';
    remarks?: string;
  }): Promise<{ record: CalibrationRecordEntity; updatedEquipment: EquipmentEntity }> {
    const res = await fetch(`${API_BASE}/calibration-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to log calibration record');
    }

    return res.json();
  },

  // Notifications
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await fetch(`${API_BASE}/notifications`);
    if (!res.ok) throw new Error('Failed to fetch notifications');
    const json = await res.json();
    return (json.data as NotificationEntity[]).map((n) => ({
      id: n.id,
      title: n.title,
      description: n.message,
      timestamp: 'Recently',
      category:
        n.type === 'CALIBRATION_OVERDUE'
          ? 'alert'
          : n.type === 'CALIBRATION_DUE_SOON'
          ? 'reminder'
          : n.type === 'CALIBRATION_COMPLETED'
          ? 'success'
          : 'system',
      read: n.is_read,
      equipmentId: n.equipment_id || undefined,
    }));
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
    });
  },
};
