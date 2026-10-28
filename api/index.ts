import express from 'express';
import dotenv from 'dotenv';
import { corsMiddleware } from '../server/middleware/cors';
import { errorHandler } from '../server/middleware/errorHandler';
import apiRouter from '../server/routes';
import { initDatabase, memoryStore } from '../server/database/config';

dotenv.config({ override: true });

const app = express();

// 1. Base Middleware
app.use(corsMiddleware);

// URL normalization for Vercel serverless rewrites and multi-environment proxies
app.use((req: any, res: any, next: any) => {
  // 1. Check if path was passed via query parameter (e.g. vercel.json rewrite /api/index?path=...)
  if (req.query && req.query.path) {
    const qPath = Array.isArray(req.query.path) ? req.query.path.join('/') : String(req.query.path);
    const cleanPath = qPath.replace(/^\//, '');
    req.url = `/api/${cleanPath}`;
    delete req.query.path;
    delete req.query.__path;
    return next();
  }

  // 2. Check Vercel routing headers if req.url was squashed to /api/index, /api, or /
  if (!req.url || req.url === '/' || req.url === '/api' || req.url.startsWith('/api/index')) {
    const forwardedPath =
      req.headers['x-matched-path'] ||
      req.headers['x-forwarded-uri'] ||
      req.headers['x-vercel-original-url'];
    if (forwardedPath && typeof forwardedPath === 'string' && forwardedPath !== '/api/index' && forwardedPath !== '/api') {
      req.url = forwardedPath;
    }
  }

  // 3. Strip /api/index prefix if still lingering
  if (req.url && req.url.startsWith('/api/index')) {
    req.url = req.url.replace('/api/index', '') || '/';
  }

  next();
});

// Resilient body parsing: handle pre-parsed bodies from Vercel serverless runtime
app.use((req: any, res: any, next: any) => {
  // If Vercel already parsed the body into an object
  if (req.body && typeof req.body === 'object') {
    req._body = true;
    return next();
  }

  // If Vercel passed body as raw JSON string or Buffer
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
      req._body = true;
      return next();
    } catch {}
  } else if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf-8'));
      req._body = true;
      return next();
    } catch {}
  }

  // Fallback to Express body parsers
  express.json({ limit: '10mb' })(req, res, (err: any) => {
    if (err) {
      req.body = req.body || {};
    }
    express.urlencoded({ extended: true, limit: '10mb' })(req, res, () => {
      req.body = req.body || {};
      next();
    });
  });
});

// Guarantee req.body is never undefined
app.use((req: any, res: any, next: any) => {
  if (!req.body || typeof req.body !== 'object') {
    req.body = {};
  }
  next();
});

// 2. REST API Routes
// Mounted at both /api and root to guarantee resolution whether Vercel strips or preserves /api prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 3. Error Handling Middleware
app.use(errorHandler);

// Database initialization promise cache for serverless execution
let initPromise: Promise<any> | null = null;
function ensureDbInit() {
  if (!initPromise) {
    initPromise = initDatabase().catch((err) => {
      console.warn('[Vercel Serverless] Database init warning (falling back to memory store):', err?.message);
    });
  }
  return initPromise;
}

// Export default serverless handler for Vercel
export default async function handler(req: any, res: any) {
  try {
    await ensureDbInit();

    // Check if response has already been sent
    if (res.writableEnded || res.finished) {
      return;
    }

    // Await Express middleware pipeline and response completion
    return new Promise<void>((resolve, reject) => {
      let resolved = false;
      const done = () => {
        if (!resolved) {
          resolved = true;
          resolve();
        }
      };

      res.once('finish', done);
      res.once('close', done);

      app(req, res, (err: any) => {
        if (err) {
          console.error('[Vercel Express Error]', err);
          if (!res.headersSent) {
            res.status(500).json({ detail: err.message || 'Internal Server Error' });
          }
          done();
        }
      });
    });
  } catch (err: any) {
    console.error('[Vercel Serverless Error]', err);
    if (!res.headersSent) {
      const url = req.url || '';
      if (url.includes('summary')) {
        const list = memoryStore.equipment || [];
        const cal = list.filter((e) => e.status === 'CALIBRATED').length;
        const due = list.filter((e) => e.status === 'DUE_SOON').length;
        const ovr = list.filter((e) => e.status === 'OVERDUE').length;
        return res.status(200).json({
          success: true,
          total_equipment: list.length,
          calibrated_count: cal,
          due_soon_count: due,
          overdue_count: ovr,
          upcoming_calibrations: [],
          recent_calibration_activity: [],
          fallback: true,
        });
      }
      return res.status(500).json({
        detail: err?.message || 'Serverless invocation error occurred.',
      });
    }
  }
}
