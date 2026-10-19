import { getPool, isFallback, memoryStore } from '../database/config';
import { DashboardSummary, EquipmentEntity } from '../models';
import { equipmentService } from './equipment.service';
import { calibrationService } from './calibration.service';

export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const equipmentList = await equipmentService.list();
    const recentCalibrationRecords = (await calibrationService.list()).slice(0, 5);

    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    let calibratedCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    const allWithMetrics = equipmentList.map((eq) => {
      let daysRemaining = 999;
      let status = eq.status || 'CALIBRATED';

      if (eq.next_calibration_date) {
        const match = eq.next_calibration_date.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (match) {
          const y = parseInt(match[1], 10);
          const m = parseInt(match[2], 10) - 1;
          const d = parseInt(match[3], 10);
          const targetUtc = new Date(Date.UTC(y, m, d));
          daysRemaining = Math.round((targetUtc.getTime() - todayUtc.getTime()) / 86400000);

          if (daysRemaining < 0) {
            status = 'OVERDUE';
          } else if (daysRemaining <= 30) {
            status = 'DUE_SOON';
          } else {
            status = 'CALIBRATED';
          }
        }
      }

      if (status === 'OVERDUE') {
        overdueCount++;
      } else if (status === 'DUE_SOON') {
        dueSoonCount++;
      } else {
        calibratedCount++;
      }

      return {
        equipmentId: eq.id,
        equipmentCode: eq.equipment_code,
        equipmentName: eq.name,
        category: eq.category,
        nextCalibrationDate: eq.next_calibration_date || '',
        daysRemaining,
        status,
      };
    });

    const upcomingCalibrationRecords = allWithMetrics
      .filter((eq) => Boolean(eq.nextCalibrationDate))
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 6);

    return {
      totalEquipment: equipmentList.length,
      calibratedCount,
      dueSoonCount,
      overdueCount,
      recentCalibrationRecords,
      upcomingCalibrationRecords,
    };
  }
}

export const dashboardService = new DashboardService();
