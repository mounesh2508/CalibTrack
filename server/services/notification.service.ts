import { getPool, isFallback, memoryStore } from '../database/config';
import { NotificationEntity } from '../models';

export class NotificationService {
  /**
   * Automatically evaluates all registered equipment in real time
   * and synchronizes in-app notifications for any DUE_SOON or OVERDUE instruments.
   */
  async syncLiveCalibrationAlerts(): Promise<void> {
    try {
      const { equipmentService } = await import('./equipment.service');
      const equipmentList = await equipmentService.list();
      const now = new Date();
      const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

      for (const eq of equipmentList) {
        if (!eq.next_calibration_date) continue;

        const dueDate = new Date(eq.next_calibration_date);
        const diffMs = dueDate.getTime() - today.getTime();
        const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));

        let alertType: 'CALIBRATION_OVERDUE' | 'CALIBRATION_DUE_SOON' | null = null;
        if (daysRemaining < 0) {
          alertType = 'CALIBRATION_OVERDUE';
        } else if (daysRemaining <= 30) {
          alertType = 'CALIBRATION_DUE_SOON';
        }

        if (alertType) {
          const isOverdue = alertType === 'CALIBRATION_OVERDUE';
          const notifId = `alert-${eq.id}`;
          const title = isOverdue
            ? `Calibration Overdue: ${eq.name}`
            : `Calibration Due Soon: ${eq.name}`;
          const message = isOverdue
            ? `Instrument ${eq.name} (${eq.equipment_code}) is overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}. Immediate ISO 17025 verification required.`
            : `Instrument ${eq.name} (${eq.equipment_code}) requires calibration within ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Calibration deadline: ${eq.next_calibration_date}.`;

          const emailDetails = {
            subject: `[CalibTrack Metrology Alert] Calibration ${isOverdue ? 'OVERDUE' : 'DUE SOON'}: ${eq.name} (${eq.equipment_code})`,
            recipients: ['asokanmounesh@gmail.com', 'technicians@calibtrack.lab'],
            sender: 'CalibTrack Laboratory <asokanmounesh@gmail.com>',
            dispatched_at: new Date().toISOString(),
            status: 'DELIVERED',
            equipment_code: eq.equipment_code,
            equipment_name: eq.name,
            urgency: isOverdue ? 'OVERDUE' : 'DUE_SOON',
            days_remaining: daysRemaining,
            due_date: eq.next_calibration_date,
            html_body: `<p><strong>${title}</strong></p><p>${message}</p>`,
          };

          // 1. Memory store sync
          const existingMemory = memoryStore.notifications.find(
            (n) => n.equipment_id === eq.id && (n.type === 'CALIBRATION_OVERDUE' || n.type === 'CALIBRATION_DUE_SOON')
          );

          if (!existingMemory) {
            memoryStore.notifications.unshift({
              id: notifId,
              user_id: null,
              equipment_id: eq.id,
              type: alertType,
              title,
              message,
              is_read: false,
              created_at: new Date().toISOString(),
              email_details: emailDetails as any,
            });
          } else {
            // Keep status and days remaining up to date
            existingMemory.type = alertType;
            existingMemory.title = title;
            existingMemory.message = message;
            existingMemory.email_details = emailDetails as any;
          }

          // 2. PostgreSQL sync if active
          if (!isFallback() && getPool()) {
            try {
              const pool = getPool()!;
              await pool.query(
                `INSERT INTO notifications (id, equipment_id, type, title, message, is_read, created_at)
                 VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
                 ON CONFLICT (id) DO UPDATE 
                 SET type = EXCLUDED.type, title = EXCLUDED.title, message = EXCLUDED.message`,
                [notifId, eq.id, alertType, title, message]
              );
            } catch {}
          }
        }
      }
    } catch (err: any) {
      console.warn('[NotificationService] Live alerts sync warning:', err?.message);
    }
  }

  async list(): Promise<NotificationEntity[]> {
    // Synchronize live due soon and overdue equipment alerts in real time
    await this.syncLiveCalibrationAlerts();

    if (isFallback() || !getPool()) {
      return [...memoryStore.notifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    const pool = getPool()!;
    try {
      const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
      // Merge memory store email_details if present
      const memoryMap = new Map(memoryStore.notifications.map((m) => [m.id, m]));
      return (rows as NotificationEntity[]).map((r) => {
        const mem = memoryMap.get(r.id);
        return mem ? { ...r, email_details: mem.email_details } : r;
      });
    } catch {
      return [...memoryStore.notifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  }

  async markAsRead(id: string): Promise<boolean> {
    const notif = memoryStore.notifications.find((n) => n.id === id);
    if (notif) {
      notif.is_read = true;
    }

    if (!isFallback() && getPool()) {
      try {
        const pool = getPool()!;
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
      } catch {}
    }

    return true;
  }

  async markAllAsRead(): Promise<number> {
    let count = 0;
    memoryStore.notifications.forEach((n) => {
      if (!n.is_read) {
        n.is_read = true;
        count++;
      }
    });

    if (!isFallback() && getPool()) {
      try {
        const pool = getPool()!;
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE');
      } catch {}
    }

    return count;
  }
}

export const notificationService = new NotificationService();
