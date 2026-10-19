import { equipmentService } from './equipment.service';
import { calibrationService } from './calibration.service';
import { predictCalibrationInterval, IntervalPredictionResult } from '../../src/utils/calibrationIntervalMl';

export class MlIntervalService {
  async getRecommendation(equipmentId: string): Promise<IntervalPredictionResult> {
    const equipment = await equipmentService.getById(equipmentId);
    if (!equipment) {
      throw new Error(`Equipment '${equipmentId}' not found.`);
    }

    // Get all calibrations for this equipment
    const allCalibrations = await calibrationService.list();
    const equipmentCalibrations = allCalibrations.filter(
      (c) => c.equipment_id === equipment.id || (equipment.equipment_code && c.equipment_id === equipment.equipment_code)
    );

    const prediction = predictCalibrationInterval({
      currentIntervalMonths: Math.max(1, Math.round(Number(equipment.calibration_interval_days || 180) / 30)),
      currentIntervalDays: Number(equipment.calibration_interval_days || 180),
      category: equipment.category,
      department: equipment.department || undefined,
      purchaseDate: equipment.purchase_date,
      calibrationRecords: equipmentCalibrations.map((c) => ({
        calibrationDate: c.calibration_date,
        result: c.result,
        environmentalTemp: c.environmental_temp,
        environmentalHumidity: c.environmental_humidity,
      })),
    });

    return prediction;
  }

  async applyRecommendedInterval(equipmentId: string): Promise<{
    success: boolean;
    equipment: any;
    prediction: IntervalPredictionResult;
  }> {
    const equipment = await equipmentService.getById(equipmentId);
    if (!equipment) {
      throw new Error(`Equipment '${equipmentId}' not found.`);
    }

    const prediction = await this.getRecommendation(equipmentId);

    // Update equipment interval days
    const newIntervalDays = prediction.recommendedIntervalDays;
    const updated = await equipmentService.update(equipment.id, {
      calibration_interval_days: newIntervalDays,
    });

    return {
      success: true,
      equipment: updated,
      prediction,
    };
  }
}

export const mlIntervalService = new MlIntervalService();
