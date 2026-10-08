import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';

export class NotificationController {
  async getAll(req: Request, res: Response, Next: NextFunction) {
    try {
      const items = await notificationService.list();
      res.json({
        success: true,
        count: items.length,
        unreadCount: items.filter((n) => !n.is_read).length,
        data: items,
      });
    } catch (error) {
      Next(error);
    }
  }

  async markAsRead(req: Request, res: Response, Next: NextFunction) {
    try {
      const { id } = req.params;
      const success = await notificationService.markAsRead(id);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: `Notification with ID "${id}" was not found.`,
          code: 'NOT_FOUND',
        });
      }

      res.json({
        success: true,
        message: 'Notification marked as read.',
      });
    } catch (error) {
      Next(error);
    }
  }

  async markAllAsRead(req: Request, res: Response, Next: NextFunction) {
    try {
      const updatedCount = await notificationService.markAllAsRead();
      res.json({
        success: true,
        message: `${updatedCount} notifications marked as read.`,
      });
    } catch (error) {
      Next(error);
    }
  }
}

export const notificationController = new NotificationController();
