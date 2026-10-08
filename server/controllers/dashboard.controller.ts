import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';

export class DashboardController {
  async getSummary(req: Request, res: Response, Next: NextFunction) {
    try {
      const summary = await dashboardService.getSummary();
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      Next(error);
    }
  }
}

export const dashboardController = new DashboardController();
