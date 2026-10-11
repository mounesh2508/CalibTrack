import { Request, Response, NextFunction } from 'express';
import { equipmentService } from '../services/equipment.service';

export class EquipmentController {
  async getAll(req: Request, res: Response, Next: NextFunction) {
    try {
      const { search, category, status, department } = req.query;
      const items = await equipmentService.list({
        search: search as string,
        category: category as string,
        status: status as string,
        department: department as string,
      });

      res.json({
        success: true,
        count: items.length,
        total: items.length,
        items: items,
        data: items,
      });
    } catch (error) {
      Next(error);
    }
  }

  async getById(req: Request, res: Response, Next: NextFunction) {
    try {
      const { id } = req.params;
      const item = await equipmentService.getById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          error: `Equipment with ID "${id}" was not found.`,
          code: 'NOT_FOUND',
        });
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      Next(error);
    }
  }

  async create(req: Request, res: Response, Next: NextFunction) {
    try {
      const {
        equipment_code,
        name,
        category,
        manufacturer,
        model_number,
        serial_number,
        location,
        department,
        purchase_date,
        calibration_interval_days,
        last_calibration_date,
        description,
      } = req.body;

      if (!equipment_code || !name || !category || calibration_interval_days === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: equipment_code, name, category, and calibration_interval_days are required.',
          code: 'VALIDATION_ERROR',
        });
      }

      const created = await equipmentService.create({
        equipment_code,
        name,
        category,
        manufacturer,
        model_number,
        serial_number,
        location,
        department,
        purchase_date,
        calibration_interval_days: Number(calibration_interval_days),
        last_calibration_date,
        description,
      });

      res.status(201).json({
        success: true,
        message: 'Equipment registered successfully.',
        data: created,
      });
    } catch (error: any) {
      if (error.code === 'DUPLICATE_CODE') {
        return res.status(409).json({
          success: false,
          error: error.message,
          code: 'DUPLICATE_CODE',
        });
      }
      Next(error);
    }
  }

  async update(req: Request, res: Response, Next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await equipmentService.update(id, req.body);

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: `Equipment with ID "${id}" was not found.`,
          code: 'NOT_FOUND',
        });
      }

      res.json({
        success: true,
        message: 'Equipment updated successfully.',
        data: updated,
      });
    } catch (error: any) {
      if (error.code === 'DUPLICATE_CODE') {
        return res.status(409).json({
          success: false,
          error: error.message,
          code: 'DUPLICATE_CODE',
        });
      }
      Next(error);
    }
  }

  async delete(req: Request, res: Response, Next: NextFunction) {
    try {
      const { id } = req.params;
      const success = await equipmentService.delete(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: `Equipment with ID "${id}" was not found or could not be deleted.`,
          code: 'NOT_FOUND',
        });
      }

      res.json({
        success: true,
        message: 'Equipment and associated records deleted successfully.',
      });
    } catch (error) {
      Next(error);
    }
  }
}

export const equipmentController = new EquipmentController();
