import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', dashboardController.getSummary);

export default router;
