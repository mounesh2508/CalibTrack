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

let fastApiProcess: any = null;

function ensureFastApiBackend() {
  const req = http.get('http://127.0.0.1:8001/api/health', () => {
    console.log('[CalibTrack] FastAPI backend is already active on 127.0.0.1:8001.');
  });
  req.on('error', () => {
    console.log('[CalibTrack] Launching FastAPI backend on 127.0.0.1:8001...');
    fastApiProcess = spawn(
      'python3',
      ['-m', 'uvicorn', 'backend.app.main:app', '--port', '8001', '--host', '127.0.0.1'],
      { stdio: 'inherit' }
    );
    fastApiProcess.on('error', (err: any) => {
      console.warn('[CalibTrack] Note: Could not spawn uvicorn process directly:', err.message);
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
    const targetUrl = new URL(req.originalUrl || req.url, 'http://127.0.0.1:8001');
    const headers: http.OutgoingHttpHeaders = { ...req.headers };
    headers.host = '127.0.0.1:8001';

    let bodyBuffer: Buffer | null = null;
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      bodyBuffer = Buffer.from(bodyStr);
      headers['content-length'] = String(bodyBuffer.length);
      headers['content-type'] = 'application/json';
    }

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: 8001,
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers,
        timeout: 10000,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', () => {
      return apiRouter(req, res, next);
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
