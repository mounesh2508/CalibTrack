import { Router, Request, Response } from 'express';
import { memoryStore, getPool, isFallback } from '../database/config';
import { emailService } from '../services/email.service';
import crypto from 'crypto';

const router = Router();

function parseSafeBody(req: Request) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

// GET /api/users - List registered laboratory staff
router.get('/', async (req: Request, res: Response) => {
  try {
    const memoryUsers = memoryStore.users.map((u, idx) => ({
      id: u.id || `usr-${idx + 1}`,
      name: u.name,
      email: u.email,
      role: u.role,
      created_at: u.created_at || '2026-01-01T08:00:00Z',
    }));

    if (!isFallback() && getPool()) {
      try {
        const pool = getPool()!;
        const [rows]: any = await pool.query('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        if (rows && rows.length > 0) {
          const map = new Map<string, any>();
          // DB users first
          rows.forEach((r: any) => map.set(r.email.toLowerCase(), r));
          // Memory store users
          memoryUsers.forEach((m) => {
            if (!map.has(m.email.toLowerCase())) {
              map.set(m.email.toLowerCase(), m);
            }
          });
          return res.json(Array.from(map.values()));
        }
      } catch (err) {
        console.warn('[Users API] DB query failed, using memory store:', err);
      }
    }

    return res.json(memoryUsers);
  } catch (err: any) {
    return res.status(500).json({ detail: err.message || 'Failed to list staff accounts.' });
  }
});

// POST /api/users - Direct Admin Staff Registration
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = parseSafeBody(req);
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = (body.role === 'ADMIN' ? 'ADMIN' : 'TECHNICIAN') as 'ADMIN' | 'TECHNICIAN';
    const password = typeof body.password === 'string' && body.password.length >= 8 ? body.password : 'LabStaff123!';

    if (!name || !email || !email.includes('@')) {
      return res.status(400).json({ detail: 'Valid staff name and email address are required.' });
    }

    // Check duplicate in memoryStore
    const existingMem = memoryStore.users.find((u) => u.email.toLowerCase() === email);
    if (existingMem) {
      return res.status(409).json({ detail: `Staff member with email ${email} is already registered.` });
    }

    const id = `usr-staff-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newUser = {
      id,
      name,
      email,
      role,
      password_hash: password,
      created_at: nowIso,
      updated_at: nowIso,
      is_active: true,
      is_email_verified: true,
    };

    // 1. Add to memory store
    memoryStore.users.unshift(newUser);

    // 2. Add to PostgreSQL if active
    if (!isFallback() && getPool()) {
      try {
        const pool = getPool()!;
        await pool.query(
          `INSERT INTO users (id, name, email, role, password_hash, created_at, updated_at, is_active, is_email_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, TRUE)
           ON CONFLICT (email) DO NOTHING`,
          [id, name, email, role, password, nowIso, nowIso]
        );
      } catch (dbErr: any) {
        console.warn('[Users API] DB insert warning:', dbErr?.message);
      }
    }

    // 3. Dispatch real welcome email via Gmail SMTP asynchronously
    emailService.sendStaffWelcomeEmail({
      to: email,
      name,
      role,
      password,
    }).catch((emailErr) => {
      console.warn('[Users API] Welcome email send warning:', emailErr?.message);
    });

    console.log(`[Users API] New staff registered by Admin: ${name} (${email}) as ${role}`);

    return res.status(201).json({
      success: true,
      message: `Staff member ${name} (${email}) successfully registered and added to staff registry.`,
      user: {
        id,
        name,
        email,
        role,
        created_at: nowIso,
      },
    });
  } catch (err: any) {
    console.error('[Users API] Create user error:', err);
    return res.status(500).json({ detail: err.message || 'Failed to create staff account.' });
  }
});

// PATCH /api/users/:id/role - Update user role
router.patch('/:id/role', async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = parseSafeBody(req);
  const role = body.role;

  if (role !== 'ADMIN' && role !== 'TECHNICIAN') {
    return res.status(400).json({ detail: 'Role must be ADMIN or TECHNICIAN.' });
  }

  const user = memoryStore.users.find((u) => u.id === id || u.email.toLowerCase() === id.toLowerCase());
  if (!user) {
    return res.status(404).json({ detail: 'Staff account not found.' });
  }

  user.role = role;
  user.updated_at = new Date().toISOString();

  if (!isFallback() && getPool()) {
    try {
      const pool = getPool()!;
      await pool.query('UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 OR email = $2', [role, id]);
    } catch {}
  }

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  });
});

// DELETE /api/users/:id - Remove staff member
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLen = memoryStore.users.length;
  memoryStore.users = memoryStore.users.filter((u) => u.id !== id && u.email.toLowerCase() !== id.toLowerCase());

  if (!isFallback() && getPool()) {
    try {
      const pool = getPool()!;
      await pool.query('DELETE FROM users WHERE id = $1 OR email = $1', [id]);
    } catch {}
  }

  return res.json({
    success: true,
    message: 'Staff account removed successfully.',
    deleted: memoryStore.users.length < initialLen,
  });
});

export default router;
