import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';

const router = Router();

// GET /api/notifications
router.get('/', notificationController.getAll);

// PATCH /api/notifications/:id/read
router.patch('/:id/read', notificationController.markAsRead);

// POST /api/notifications/read-all
router.post('/read-all', notificationController.markAllAsRead);

export default router;
