import { getPool, isFallback, memoryStore } from '../database/config';
import { DashboardSummary, EquipmentEntity } from '../models';
import { equipmentService } from './equipment.service';
import { calibrationService } from './calibration.service';

export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const equipmentList = await equipmentService.list();
    const recentCalibrationRecords = (await calibrationService.list()).slice(0, 5);

    const now = Date.now();
    let calibratedCount = 0;
    let dueSoonCount = 0;
    let overdueCount = 0;

    const upcomingCalibrationRecords = equipmentList
      .filter((eq) => eq.next_calibration_date)
      .map((eq) => {
        const nextDate = new Date(eq.next_calibration_date!);
        const daysRemaining = Math.ceil((nextDate.getTime() - now) / (1000 * 60 * 60 * 24));

        if (eq.status === 'OVERDUE' || daysRemaining < 0) {
          overdueCount++;
        } else if (eq.status === 'DUE_SOON' || daysRemaining <= 30) {
          dueSoonCount++;
        } else {
          calibratedCount++;
        }

        return {
          equipmentId: eq.id,
          equipmentCode: eq.equipment_code,
          equipmentName: eq.name,
          category: eq.category,
          nextCalibrationDate: eq.next_calibration_date!,
          daysRemaining,
          status: eq.status,
        };
      })
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
