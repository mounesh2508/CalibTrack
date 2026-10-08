import cors from 'cors';

const isProduction = process.env.NODE_ENV === 'production';

// In development or preview, accept same-origin and AI Studio dev ports
const allowedOrigins = [
  process.env.APP_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
].filter(Boolean) as string[];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser tools, curl, or same-origin requests where origin is undefined
    if (!origin) return callback(null, true);

    if (!isProduction) {
      // In development allow local origins or AI Studio domains
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin) || origin.endsWith('.run.app')) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
