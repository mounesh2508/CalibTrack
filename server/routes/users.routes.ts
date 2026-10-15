import { Router, Request, Response } from 'express';
import { memoryStore } from '../database/config';

const router = Router();

// GET /api/users - List registered laboratory staff
router.get('/', (req: Request, res: Response) => {
  const userList = memoryStore.users.map((u, idx) => ({
    id: u.id || `usr-${idx + 1}`,
    name: u.name,
    email: u.email,
    role: u.role,
    created_at: u.created_at || '2026-01-01T08:00:00Z',
  }));
  return res.json(userList);
});

// PATCH /api/users/:id/role - Update user role
router.patch('/:id/role', (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (role !== 'ADMIN' && role !== 'TECHNICIAN') {
    return res.status(400).json({ detail: 'Role must be ADMIN or TECHNICIAN.' });
  }

  const user = memoryStore.users.find((u) => u.id === id);
  if (!user) {
    return res.status(404).json({ detail: 'Staff account not found.' });
  }

  user.role = role;
  user.updated_at = new Date().toISOString();

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  });
});

export default router;
