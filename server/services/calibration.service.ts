import { getPool, isFallback, memoryStore } from '../database/config';
import { CalibrationRecordEntity, DbCalibrationResult, DbEquipmentStatus } from '../models';
import { equipmentService } from './equipment.service';
import crypto from 'crypto';

export class CalibrationService {
  async list(filters: { equipmentId?: string; result?: string } = {}): Promise<CalibrationRecordEntity[]> {
    if (isFallback() || !getPool()) {
      let records = [...memoryStore.calibrationRecords];
      if (filters.equipmentId) {
        records = records.filter((r) => r.equipment_id === filters.equipmentId);
      }
      if (filters.result && filters.result !== 'All') {
        const expected = filters.result.toUpperCase();
        records = records.filter((r) => r.result === expected);
      }
      return records.sort((a, b) => new Date(b.calibration_date).getTime() - new Date(a.calibration_date).getTime());
    }

    const pool = getPool()!;
    let sql = 'SELECT * FROM calibration_records WHERE 1=1';
    const params: any[] = [];

    if (filters.equipmentId) {
      sql += ' AND equipment_id = ?';
      params.push(filters.equipmentId);
    }

    if (filters.result && filters.result !== 'All') {
      sql += ' AND result = ?';
      params.push(filters.result.toUpperCase());
    }

    sql += ' ORDER BY calibration_date DESC';

    const [rows] = await pool.query(sql, params);
    return rows as CalibrationRecordEntity[];
  }

  async getForEquipment(equipmentId: string): Promise<CalibrationRecordEntity[]> {
    return this.list({ equipmentId });
  }

  async getById(id: string): Promise<CalibrationRecordEntity | null> {
    if (isFallback() || !getPool()) {
      const rec = memoryStore.calibrationRecords.find((r) => r.id === id);
      return rec || null;
    }

    const pool = getPool()!;
    const [rows]: any = await pool.query('SELECT * FROM calibration_records WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0 ? (rows[0] as CalibrationRecordEntity) : null;
  }

  async create(data: {
    equipment_id: string;
    calibration_date: string;
    next_due_date?: string;
    performed_by?: string;
    calibration_provider?: string;
    certificate_number?: string;
    result?: DbCalibrationResult;
    remarks?: string;
    certificate_file_path?: string;
    created_by?: string;
  }): Promise<{ record: CalibrationRecordEntity; updatedEquipment: any }> {
    // 1. Validate the equipment exists
    const equipment = await equipmentService.getById(data.equipment_id);
    if (!equipment) {
      const err: any = new Error(`Equipment with ID "${data.equipment_id}" does not exist.`);
      err.status = 404;
      err.code = 'EQUIPMENT_NOT_FOUND';
      throw err;
    }

    if (!data.calibration_date) {
      throw new Error('calibration_date is required.');
    }

    // 2. Compute next_due_date if not explicitly provided
    let calculatedNextDue = data.next_due_date;
    if (!calculatedNextDue) {
      const calibDateObj = new Date(data.calibration_date);
      const nextDueObj = new Date(
        calibDateObj.getTime() + equipment.calibration_interval_days * 24 * 60 * 60 * 1000
      );
      calculatedNextDue = nextDueObj.toISOString().split('T')[0];
    }

    const recordId = `rec-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const result: DbCalibrationResult = data.result || 'PASSED';

    const record: CalibrationRecordEntity = {
      id: recordId,
      equipment_id: equipment.id,
      calibration_date: data.calibration_date,
      next_due_date: calculatedNextDue,
      performed_by: data.performed_by || 'Metrology Technician',
      calibration_provider: data.calibration_provider || 'Certified Calibration Lab',
      certificate_number: data.certificate_number || `CERT-${equipment.equipment_code}-${Date.now().toString().slice(-4)}`,
      result,
      remarks: data.remarks || 'Standard routine calibration executed.',
      certificate_file_path: data.certificate_file_path || null,
      created_by: data.created_by || null,
      created_at: now,
    };

    // 3. Update equipment last and next calibration dates and status
    const nextDueDateObj = new Date(calculatedNextDue);
    const diffDays = Math.ceil((nextDueDateObj.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    let newStatus: DbEquipmentStatus = 'CALIBRATED';
    if (result === 'FAILED') {
      newStatus = 'OVERDUE';
    } else if (diffDays < 0) {
      newStatus = 'OVERDUE';
    } else if (diffDays <= 30) {
      newStatus = 'DUE_SOON';
    }

    const updatedEquipment = await equipmentService.update(equipment.id, {
      last_calibration_date: data.calibration_date,
      next_calibration_date: calculatedNextDue,
      status: newStatus,
    });

    // 4. Store record in DB or fallback
    if (isFallback() || !getPool()) {
      memoryStore.calibrationRecords.unshift(record);

      // Add notification
      memoryStore.notifications.unshift({
        id: `notif-${crypto.randomUUID().slice(0, 8)}`,
        user_id: null,
        equipment_id: equipment.id,
        type: 'CALIBRATION_COMPLETED',
        title: 'Calibration Logged',
        message: `${equipment.name} (${equipment.equipment_code}) calibrated with result: ${result}.`,
        is_read: false,
        created_at: now,
      });

      return { record, updatedEquipment };
    }

    const pool = getPool()!;
    await pool.query(
      `INSERT INTO calibration_records (
        id, equipment_id, calibration_date, next_due_date, performed_by,
        calibration_provider, certificate_number, result, remarks,
        certificate_file_path, created_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.equipment_id,
        record.calibration_date,
        record.next_due_date,
        record.performed_by,
        record.calibration_provider,
        record.certificate_number,
        record.result,
        record.remarks,
        record.certificate_file_path,
        record.created_by,
        record.created_at,
      ]
    );

    // Insert notification
    await pool.query(
      `INSERT INTO notifications (id, user_id, equipment_id, type, title, message, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        `notif-${crypto.randomUUID().slice(0, 8)}`,
        null,
        equipment.id,
        'CALIBRATION_COMPLETED',
        'Calibration Logged',
        `${equipment.name} (${equipment.equipment_code}) calibrated with result: ${result}.`,
        false,
      ]
    );

    return { record, updatedEquipment };
  }
}

export const calibrationService = new CalibrationService();
