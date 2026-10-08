import { Router } from 'express';
import { calibrationController } from '../controllers/calibration.controller';

const router = Router();

// GET /api/calibration-records (filter by equipmentId or result)
router.get('/', calibrationController.getAll);

// POST /api/calibration-records
router.post('/', calibrationController.create);

export default router;
