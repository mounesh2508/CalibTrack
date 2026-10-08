import { Request, Response, NextFunction } from 'express';
import { calibrationService } from '../services/calibration.service';

export class CalibrationController {
  async getAll(req: Request, res: Response, Next: NextFunction) {
    try {
      const { equipmentId, result } = req.query;
      const records = await calibrationService.list({
        equipmentId: equipmentId as string,
        result: result as string,
      });

      res.json({
        success: true,
        count: records.length,
        data: records,
      });
    } catch (error) {
      Next(error);
    }
  }

  async getForEquipment(req: Request, res: Response, Next: NextFunction) {
    try {
      const { id } = req.params;
      const records = await calibrationService.getForEquipment(id);

      res.json({
        success: true,
        count: records.length,
        equipmentId: id,
        data: records,
      });
    } catch (error) {
      Next(error);
    }
  }

  async create(req: Request, res: Response, Next: NextFunction) {
    try {
      const {
        equipment_id,
        calibration_date,
        next_due_date,
        performed_by,
        calibration_provider,
        certificate_number,
        result,
        remarks,
        certificate_file_path,
      } = req.body;

      if (!equipment_id || !calibration_date) {
        return res.status(400).json({
          success: false,
          error: 'equipment_id and calibration_date are required.',
          code: 'VALIDATION_ERROR',
        });
      }

      const { record, updatedEquipment } = await calibrationService.create({
        equipment_id,
        calibration_date,
        next_due_date,
        performed_by,
        calibration_provider,
        certificate_number,
        result,
        remarks,
        certificate_file_path,
      });

      res.status(201).json({
        success: true,
        message: 'Calibration record logged and equipment schedule updated.',
        data: record,
        updatedEquipment,
      });
    } catch (error: any) {
      if (error.code === 'EQUIPMENT_NOT_FOUND') {
        return res.status(404).json({
          success: false,
          error: error.message,
          code: 'EQUIPMENT_NOT_FOUND',
        });
      }
      Next(error);
    }
  }
}

export const calibrationController = new CalibrationController();
