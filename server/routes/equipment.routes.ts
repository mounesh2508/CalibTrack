import { Router } from 'express';
import { equipmentController } from '../controllers/equipment.controller';
import { calibrationController } from '../controllers/calibration.controller';

const router = Router();

// GET /api/equipment (with optional search, category, status, department filters)
router.get('/', equipmentController.getAll);

// POST /api/equipment
router.post('/', equipmentController.create);

// GET /api/equipment/:id
router.get('/:id', equipmentController.getById);

// PUT /api/equipment/:id
router.put('/:id', equipmentController.update);

// DELETE /api/equipment/:id
router.delete('/:id', equipmentController.delete);

// GET /api/equipment/:id/calibration-records
router.get('/:id/calibration-records', calibrationController.getForEquipment);

export default router;
