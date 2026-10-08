import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { corsMiddleware } from './server/middleware/cors';
import { errorHandler } from './server/middleware/errorHandler';
import apiRouter from './server/routes';
import { initDatabase } from './server/database/config';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // 1. Initialize Database (MySQL connection pool or memory store fallback)
  await initDatabase();

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

  // 3. Mount Backend REST API
  app.use('/api', apiRouter);

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
