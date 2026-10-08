import { getPool, isFallback, memoryStore } from '../database/config';
import { NotificationEntity } from '../models';

export class NotificationService {
  async list(): Promise<NotificationEntity[]> {
    if (isFallback() || !getPool()) {
      return [...memoryStore.notifications].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    const pool = getPool()!;
    const [rows] = await pool.query('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
    return rows as NotificationEntity[];
  }

  async markAsRead(id: string): Promise<boolean> {
    if (isFallback() || !getPool()) {
      const notif = memoryStore.notifications.find((n) => n.id === id);
      if (notif) {
        notif.is_read = true;
        return true;
      }
      return false;
    }

    const pool = getPool()!;
    const [result]: any = await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  async markAllAsRead(): Promise<number> {
    if (isFallback() || !getPool()) {
      let count = 0;
      memoryStore.notifications.forEach((n) => {
        if (!n.is_read) {
          n.is_read = true;
          count++;
        }
      });
      return count;
    }

    const pool = getPool()!;
    const [result]: any = await pool.query('UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE');
    return result.affectedRows;
  }
}

export const notificationService = new NotificationService();
