import { type Request, type Response, type NextFunction } from 'express';

/**
 * Universal Zero-Dependency CORS middleware for CalibTrack API
 * Optimized for Vercel Serverless Functions and standalone Express instances.
 * Guarantees cross-origin requests succeed without third-party library header crashes.
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || '*';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle browser preflight requests immediately
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  next();
};
