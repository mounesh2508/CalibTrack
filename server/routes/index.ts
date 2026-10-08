import { Router } from 'express';
import healthRoutes from './health.routes';
import equipmentRoutes from './equipment.routes';
import calibrationRoutes from './calibration.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';

const apiRouter = Router();

apiRouter.use('/health', healthRoutes);
apiRouter.use('/equipment', equipmentRoutes);
apiRouter.use('/calibration-records', calibrationRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/dashboard', dashboardRoutes);

export default apiRouter;
