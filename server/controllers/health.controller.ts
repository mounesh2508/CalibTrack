import { Request, Response } from 'express';
import { getDatabaseStatus } from '../database/config';

export function getHealth(req: Request, res: Response) {
  const dbStatus = getDatabaseStatus();

  res.json({
    status: 'ok',
    service: 'CalibTrack Laboratory Metrology API',
    version: '2.0.0-phase2',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus.connected ? 'healthy' : 'fallback-active',
      type: dbStatus.type,
      databaseName: dbStatus.databaseName,
      message: dbStatus.message,
    },
    features: {
      authentication: 'Phase 3 (planned)',
      emailReminders: 'Phase 3 (planned)',
      reportsExport: 'Phase 3 (planned)',
      aiPredictions: 'Phase 4 (planned)',
    },
  });
}
