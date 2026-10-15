import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { corsMiddleware } from './server/middleware/cors';
import { errorHandler } from './server/middleware/errorHandler';
import http from 'http';
import { spawn } from 'child_process';
import apiRouter from './server/routes';
import { initDatabase } from './server/database/config';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FASTAPI_URL = process.env.FASTAPI_URL || process.env.BACKEND_URL || 'http://127.0.0.1:8001';
const fastApiTarget = new URL(FASTAPI_URL);

let fastApiProcess: any = null;

function ensureFastApiBackend() {
  const healthUrl = `${FASTAPI_URL.replace(/\/$/, '')}/api/health`;
  const req = http.get(healthUrl, () => {
    console.log(`[CalibTrack] FastAPI backend is already active on ${FASTAPI_URL}.`);
  });
  req.on('error', () => {
    console.log(`[CalibTrack] Launching FastAPI backend on ${FASTAPI_URL}...`);
    const isWin = process.platform === 'win32';
    const pythonCmd = isWin ? 'py' : 'python3';
    const port = fastApiTarget.port || '8001';
    const host = fastApiTarget.hostname || '127.0.0.1';
    fastApiProcess = spawn(
      pythonCmd,
      ['-m', 'uvicorn', 'backend.app.main:app', '--port', port, '--host', host],
      { stdio: 'inherit', shell: isWin }
    );
    fastApiProcess.on('error', (err: any) => {
      console.warn(`[CalibTrack] Note: Could not spawn uvicorn process directly with ${pythonCmd}:`, err.message);
    });
  });
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Initialize Database & FastAPI service
  await initDatabase();
  ensureFastApiBackend();

  // 2. Base Middleware
  app.use(corsMiddleware);
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logger for development
  app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
      console.log(`[HTTP ${req.method}] ${req.url}`);
    }
    next();
  });

  // 3. Mount Backend REST API (FastAPI proxy with fallback to Express router)
  app.use('/api', (req, res, next) => {
    // Reconstruct full request path, ensuring /api is always present
    let rawPath = req.originalUrl || req.url || '';
    if (!rawPath.startsWith('/api')) {
      rawPath = `/api${rawPath.startsWith('/') ? '' : '/'}${rawPath}`;
    }
    const [pathname, search] = rawPath.split('?');
    const queryString = search ? `?${search}` : '';

    const headers: http.OutgoingHttpHeaders = { ...req.headers };
    headers.host = `${fastApiTarget.hostname}:${fastApiTarget.port || 8001}`;
    // Remove hop-by-hop headers that can interfere with proxy connection
    delete headers['connection'];
    delete headers['upgrade'];
    delete headers['keep-alive'];
    delete headers['transfer-encoding'];

    let bodyBuffer: Buffer | null = null;
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      bodyBuffer = Buffer.from(bodyStr);
      headers['content-length'] = String(bodyBuffer.length);
      headers['content-type'] = 'application/json';
    } else if (req.headers['content-length'] && Number(req.headers['content-length']) === 0) {
      headers['content-length'] = '0';
    }

    const proxyReq = http.request(
      {
        hostname: fastApiTarget.hostname,
        port: Number(fastApiTarget.port) || 8001,
        path: pathname + queryString,
        method: req.method,
        headers,
        timeout: 10000,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err: any) => {
      console.warn(`[CalibTrack Proxy] Could not connect to FastAPI at ${FASTAPI_URL} (${req.method} ${pathname}), routing via Express backend:`, err.message);

      // Fall back to Express router for all endpoints (including auth & mock/in-memory data routes)
      return apiRouter(req, res, () => {
        return res.status(503).json({
          detail: `Backend service is unavailable at ${FASTAPI_URL}. Please ensure service is running.`,
          error: err.code || err.message,
        });
      });
    });

    if (bodyBuffer) {
      proxyReq.write(bodyBuffer);
    }
    proxyReq.end();
  });

  // 4. Frontend Serving (Vite middleware in dev, static dist in production)
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  // 5. Global Error Handling Middleware
  app.use(errorHandler);

  // 6. Listen on Port 3000
  app.listen(port, '0.0.0.0', () => {
    console.log(`[CalibTrack] Full-stack application ready at http://0.0.0.0:${port}`);
    console.log(`[CalibTrack] REST API endpoints active under /api/*`);
  });
}

startServer().catch((error) => {
  console.error('[CalibTrack] Fatal startup error:', error);
  process.exit(1);
});
