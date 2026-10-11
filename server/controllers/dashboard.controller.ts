import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';

export class DashboardController {
  async getSummary(req: Request, res: Response, Next: NextFunction) {
    try {
      const summary = await dashboardService.getSummary();
      res.json({
        success: true,
        total_equipment: summary.totalEquipment,
        calibrated_count: summary.calibratedCount,
        due_soon_count: summary.dueSoonCount,
        overdue_count: summary.overdueCount,
        upcoming_calibrations: summary.upcomingCalibrationRecords,
        recent_calibration_activity: summary.recentCalibrationRecords,
        data: summary,
      });
    } catch (error) {
      Next(error);
    }
  }
}

export const dashboardController = new DashboardController();
