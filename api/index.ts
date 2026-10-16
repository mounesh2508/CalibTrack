import express from 'express';
import dotenv from 'dotenv';
import { corsMiddleware } from '../server/middleware/cors';
import { errorHandler } from '../server/middleware/errorHandler';
import apiRouter from '../server/routes';
import { initDatabase } from '../server/database/config';

dotenv.config();

const app = express();

// 1. Base Middleware
app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  await ensureDbInit();
  return app(req, res);
}
