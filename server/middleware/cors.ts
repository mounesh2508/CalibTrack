import cors from 'cors';

/**
 * Universal CORS middleware for CalibTrack API
 * Allows cross-origin requests from any client origin (Vercel domains, localhost, custom domains)
 */
export const corsMiddleware = cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
