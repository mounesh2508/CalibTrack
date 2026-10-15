import { getPool, isFallback, memoryStore } from '../database/config';
import { EquipmentEntity, DbEquipmentStatus } from '../models';
import crypto from 'crypto';

export interface EquipmentFilterOptions {
  search?: string;
  category?: string;
  status?: string;
  department?: string;
}

export class EquipmentService {
  async list(filters: EquipmentFilterOptions = {}): Promise<EquipmentEntity[]> {
    if (isFallback() || !getPool()) {
      let items = [...memoryStore.equipment];

      if (filters.search) {
        const q = filters.search.toLowerCase();
        items = items.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.equipment_code.toLowerCase().includes(q) ||
            (e.manufacturer && e.manufacturer.toLowerCase().includes(q)) ||
            (e.serial_number && e.serial_number.toLowerCase().includes(q))
        );
      }

      if (filters.category && filters.category !== 'All') {
        items = items.filter((e) => e.category === filters.category);
      }

      if (filters.status && filters.status !== 'All') {
        const normStatus = filters.status.toUpperCase();
        items = items.filter((e) => e.status === normStatus);
      }

      if (filters.department && filters.department !== 'All') {
        items = items.filter((e) => e.department === filters.department);
      }

      return items;
    }

    const pool = getPool()!;
    let sql = 'SELECT * FROM equipment WHERE 1=1';
    const params: any[] = [];

    if (filters.search) {
      sql += ' AND (name LIKE ? OR equipment_code LIKE ? OR manufacturer LIKE ? OR serial_number LIKE ?)';
      const term = `%${filters.search}%`;
      params.push(term, term, term, term);
    }

    if (filters.category && filters.category !== 'All') {
      sql += ' AND category = ?';
      params.push(filters.category);
    }

    if (filters.status && filters.status !== 'All') {
      sql += ' AND status = ?';
      params.push(filters.status.toUpperCase());
    }

    if (filters.department && filters.department !== 'All') {
      sql += ' AND department = ?';
      params.push(filters.department);
    }

    sql += ' ORDER BY next_calibration_date ASC';

    const [rows] = await pool.query(sql, params);
    return rows as EquipmentEntity[];
  }

  async getById(id: string): Promise<EquipmentEntity | null> {
    if (isFallback() || !getPool()) {
      const item = memoryStore.equipment.find((e) => e.id === id || e.equipment_code === id);
      return item || null;
    }

    const pool = getPool()!;
    const [rows]: any = await pool.query(
      'SELECT * FROM equipment WHERE id = ? OR equipment_code = ? LIMIT 1',
      [id, id]
    );

    return rows.length > 0 ? (rows[0] as EquipmentEntity) : null;
  }

  async getByCode(code: string): Promise<EquipmentEntity | null> {
    if (isFallback() || !getPool()) {
      const item = memoryStore.equipment.find((e) => e.equipment_code.toLowerCase() === code.toLowerCase());
      return item || null;
    }

    const pool = getPool()!;
    const [rows]: any = await pool.query('SELECT * FROM equipment WHERE equipment_code = ? LIMIT 1', [code]);
    return rows.length > 0 ? (rows[0] as EquipmentEntity) : null;
  }

  async create(data: {
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
    created_by?: string;
  }): Promise<EquipmentEntity> {
    // Validate required fields
    if (!data.equipment_code || !data.name || !data.category || data.calibration_interval_days === undefined) {
      throw new Error('Required equipment fields missing: equipment_code, name, category, and calibration_interval_days are required.');
    }

    // Check duplicate code
    const existing = await this.getByCode(data.equipment_code);
    if (existing) {
      const error: any = new Error(`Equipment with code "${data.equipment_code}" already exists.`);
      error.code = 'DUPLICATE_CODE';
      error.status = 409;
      throw error;
    }

    const id = `eq-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // Calculate next_calibration_date & status
    let nextDate: string | null = null;
    let status: DbEquipmentStatus = 'CALIBRATED';

    if (data.last_calibration_date) {
      const last = new Date(data.last_calibration_date);
      const next = new Date(last.getTime() + data.calibration_interval_days * 24 * 60 * 60 * 1000);
      nextDate = next.toISOString().split('T')[0];

      const diffDays = Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) status = 'OVERDUE';
      else if (diffDays <= 30) status = 'DUE_SOON';
      else status = 'CALIBRATED';
    }

    const entity: EquipmentEntity = {
      id,
      equipment_code: data.equipment_code.trim(),
      name: data.name.trim(),
      category: data.category.trim(),
      manufacturer: data.manufacturer || null,
      model_number: data.model_number || null,
      serial_number: data.serial_number || null,
      location: data.location || null,
      department: data.department || null,
      purchase_date: data.purchase_date || null,
      calibration_interval_days: Number(data.calibration_interval_days),
      last_calibration_date: data.last_calibration_date || null,
      next_calibration_date: nextDate,
      status,
      description: data.description || null,
      created_by: data.created_by || null,
      created_at: now,
      updated_at: now,
    };

    if (isFallback() || !getPool()) {
      memoryStore.equipment.unshift(entity);
      return entity;
    }

    const pool = getPool()!;
    await pool.query(
      `INSERT INTO equipment (
        id, equipment_code, name, category, manufacturer, model_number, serial_number,
        location, department, purchase_date, calibration_interval_days,
        last_calibration_date, next_calibration_date, status, description, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.id,
        entity.equipment_code,
        entity.name,
        entity.category,
        entity.manufacturer,
        entity.model_number,
        entity.serial_number,
        entity.location,
        entity.department,
        entity.purchase_date,
        entity.calibration_interval_days,
        entity.last_calibration_date,
        entity.next_calibration_date,
        entity.status,
        entity.description,
        entity.created_by,
        entity.created_at,
        entity.updated_at,
      ]
    );

    return entity;
  }

  async update(id: string, updates: Partial<EquipmentEntity>): Promise<EquipmentEntity | null> {
    const current = await this.getById(id);
    if (!current) return null;

    if (updates.equipment_code && updates.equipment_code !== current.equipment_code) {
      const codeCheck = await this.getByCode(updates.equipment_code);
      if (codeCheck && codeCheck.id !== current.id) {
        const error: any = new Error(`Equipment code "${updates.equipment_code}" is already in use.`);
        error.code = 'DUPLICATE_CODE';
        error.status = 409;
        throw error;
      }
    }

    const updated: EquipmentEntity = {
      ...current,
      ...updates,
      id: current.id,
      updated_at: new Date().toISOString(),
    };

    if (isFallback() || !getPool()) {
      const index = memoryStore.equipment.findIndex((e) => e.id === current.id);
      if (index !== -1) {
        memoryStore.equipment[index] = updated;
      }
      return updated;
    }

    const pool = getPool()!;
    await pool.query(
      `UPDATE equipment SET
        equipment_code = ?, name = ?, category = ?, manufacturer = ?,
        model_number = ?, serial_number = ?, location = ?, department = ?,
        purchase_date = ?, calibration_interval_days = ?, last_calibration_date = ?,
        next_calibration_date = ?, status = ?, description = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        updated.equipment_code,
        updated.name,
        updated.category,
        updated.manufacturer,
        updated.model_number,
        updated.serial_number,
        updated.location,
        updated.department,
        updated.purchase_date,
        updated.calibration_interval_days,
        updated.last_calibration_date,
        updated.next_calibration_date,
        updated.status,
        updated.description,
        current.id,
      ]
    );

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const current = await this.getById(id);
    if (!current) return false;

    if (isFallback() || !getPool()) {
      const beforeLen = memoryStore.equipment.length;
      memoryStore.equipment = memoryStore.equipment.filter((e) => e.id !== current.id);
      // Delete associated calibration records
      memoryStore.calibrationRecords = memoryStore.calibrationRecords.filter((r) => r.equipment_id !== current.id);
      return memoryStore.equipment.length < beforeLen;
    }

    const pool = getPool()!;
    const [result]: any = await pool.query('DELETE FROM equipment WHERE id = ?', [current.id]);
    return result.affectedRows > 0;
  }
  async bulkCreate(items: Array<{
    equipment_code: string;
    name: string;
    category: string;
    manufacturer?: string;
    model_number?: string;
    serial_number?: string;
    location?: string;
    department?: string;
    purchase_date?: string;
    calibration_interval_days?: number;
    last_calibration_date?: string;
    description?: string;
    created_by?: string;
  }>): Promise<{
    success: boolean;
    totalProcessed: number;
    importedCount: number;
    skippedCount: number;
    createdItems: EquipmentEntity[];
    skippedItems: Array<{ equipment_code: string; name: string; reason: string }>;
  }> {
    const skippedItems: Array<{ equipment_code: string; name: string; reason: string }> = [];
    const validEntities: EquipmentEntity[] = [];

    // Track codes and serial numbers encountered in this run to detect internal batch duplicates
    const seenCodes = new Set<string>();
    const seenSerials = new Set<string>();

    // Pre-populate with existing codes and serials from memoryStore / DB
    if (isFallback() || !getPool()) {
      for (const eq of memoryStore.equipment) {
        if (eq.equipment_code) seenCodes.add(eq.equipment_code.toLowerCase().trim());
        if (eq.serial_number) seenSerials.add(eq.serial_number.toLowerCase().trim());
      }
    } else {
      const pool = getPool()!;
      const [rows]: any = await pool.query('SELECT equipment_code, serial_number FROM equipment');
      for (const r of rows) {
        if (r.equipment_code) seenCodes.add(String(r.equipment_code).toLowerCase().trim());
        if (r.serial_number) seenSerials.add(String(r.serial_number).toLowerCase().trim());
      }
    }

    const now = new Date().toISOString();

    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const code = (raw.equipment_code || '').trim();
      const name = (raw.name || '').trim();
      const category = (raw.category || '').trim();
      const intervalDays = raw.calibration_interval_days ? Number(raw.calibration_interval_days) : 180;
      const serial = (raw.serial_number || '').trim();

      // Field presence checks
      if (!code) {
        skippedItems.push({
          equipment_code: `Row ${i + 1}`,
          name: name || 'Unnamed Instrument',
          reason: 'Missing equipment code',
        });
        continue;
      }

      if (!name) {
        skippedItems.push({
          equipment_code: code,
          name: 'Missing Name',
          reason: 'Equipment name is required',
        });
        continue;
      }

      if (!category) {
        skippedItems.push({
          equipment_code: code,
          name,
          reason: 'Equipment category is required',
        });
        continue;
      }

      if (isNaN(intervalDays) || intervalDays <= 0) {
        skippedItems.push({
          equipment_code: code,
          name,
          reason: `Invalid calibration interval: "${raw.calibration_interval_days}". Must be a positive number of days.`,
        });
        continue;
      }

      // Duplicate equipment code check
      if (seenCodes.has(code.toLowerCase())) {
        skippedItems.push({
          equipment_code: code,
          name,
          reason: `Duplicate equipment code "${code}" already registered in database or batch.`,
        });
        continue;
      }

      // Duplicate serial number check (if provided)
      if (serial && seenSerials.has(serial.toLowerCase())) {
        skippedItems.push({
          equipment_code: code,
          name,
          reason: `Duplicate serial number "${serial}" already exists in database or batch.`,
        });
        continue;
      }

      // Mark code and serial as seen for subsequent items in this batch
      seenCodes.add(code.toLowerCase());
      if (serial) seenSerials.add(serial.toLowerCase());

      // Calculate next calibration date & status
      let nextDate: string | null = null;
      let status: DbEquipmentStatus = 'CALIBRATED';
      let lastDate: string | null = null;

      if (raw.last_calibration_date) {
        const parsed = new Date(raw.last_calibration_date);
        if (!isNaN(parsed.getTime())) {
          lastDate = parsed.toISOString().split('T')[0];
          const next = new Date(parsed.getTime() + intervalDays * 24 * 60 * 60 * 1000);
          nextDate = next.toISOString().split('T')[0];

          const diffDays = Math.ceil((next.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) status = 'OVERDUE';
          else if (diffDays <= 30) status = 'DUE_SOON';
          else status = 'CALIBRATED';
        }
      }

      if (!nextDate) {
        // Default next calibration date from today + interval
        const next = new Date(Date.now() + intervalDays * 24 * 60 * 60 * 1000);
        nextDate = next.toISOString().split('T')[0];
      }

      const id = `eq-${crypto.randomUUID().slice(0, 8)}`;
      const entity: EquipmentEntity = {
        id,
        equipment_code: code,
        name,
        category,
        manufacturer: raw.manufacturer ? raw.manufacturer.trim() : null,
        model_number: raw.model_number ? raw.model_number.trim() : null,
        serial_number: serial || null,
        location: raw.location ? raw.location.trim() : 'Central Laboratory',
        department: raw.department ? raw.department.trim() : 'Quality Control',
        purchase_date: raw.purchase_date || null,
        calibration_interval_days: intervalDays,
        last_calibration_date: lastDate,
        next_calibration_date: nextDate,
        status,
        description: raw.description ? raw.description.trim() : null,
        created_by: raw.created_by || 'CSV Batch Import',
        created_at: now,
        updated_at: now,
      };

      validEntities.push(entity);
    }

    // Persist all valid items
    if (validEntities.length > 0) {
      if (isFallback() || !getPool()) {
        memoryStore.equipment.unshift(...validEntities);
      } else {
        const pool = getPool()!;
        for (const entity of validEntities) {
          await pool.query(
            `INSERT INTO equipment (
              id, equipment_code, name, category, manufacturer, model_number,
              serial_number, location, department, purchase_date,
              calibration_interval_days, last_calibration_date, next_calibration_date,
              status, description, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              entity.id,
              entity.equipment_code,
              entity.name,
              entity.category,
              entity.manufacturer,
              entity.model_number,
              entity.serial_number,
              entity.location,
              entity.department,
              entity.purchase_date,
              entity.calibration_interval_days,
              entity.last_calibration_date,
              entity.next_calibration_date,
              entity.status,
              entity.description,
              entity.created_by,
              entity.created_at,
              entity.updated_at,
            ]
          );
        }
      }
    }

    return {
      success: true,
      totalProcessed: items.length,
      importedCount: validEntities.length,
      skippedCount: skippedItems.length,
      createdItems: validEntities,
      skippedItems,
    };
  }
}

export const equipmentService = new EquipmentService();
