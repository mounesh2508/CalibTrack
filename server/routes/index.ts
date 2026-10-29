import { Router } from 'express';
import healthRoutes from './health.routes';
import equipmentRoutes from './equipment.routes';
import calibrationRoutes from './calibration.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';
import authRoutes from './auth.routes';
import reminderRoutes from './reminder.routes';
import usersRoutes from './users.routes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/users', usersRoutes);
apiRouter.use('/health', healthRoutes);
apiRouter.use('/equipment', equipmentRoutes);
apiRouter.use('/calibration-records', calibrationRoutes);
apiRouter.use('/calibrations', calibrationRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/reminders', reminderRoutes);

export default apiRouter;
