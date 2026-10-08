import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { memoryStore } from './config';

dotenv.config();

export async function runSeed(): Promise<{ success: boolean; message: string }> {
  console.log('[Seed] Seeding laboratory calibration database...');

  const rawUrl = process.env.MYSQL_DATABASE_URL || process.env.MYSQL_URL || process.env.DATABASE_URL;
  const isMysqlUrl = rawUrl && (rawUrl.startsWith('mysql://') || rawUrl.startsWith('mysql2://')) && !rawUrl.includes('[YOUR-PASSWORD]');
  const databaseUrl = isMysqlUrl ? rawUrl : undefined;

  const host =
    process.env.MYSQL_HOST ||
    (process.env.DB_HOST && !process.env.DB_HOST.includes('supabase') && !process.env.DB_HOST.includes('postgres')
      ? process.env.DB_HOST
      : 'localhost');
  const user =
    process.env.MYSQL_USER ||
    (process.env.DB_USER && !process.env.DB_USER.startsWith('postgres') ? process.env.DB_USER : 'root');
  const password = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || process.env.DB_NAME || 'calibtrack';
  const port = parseInt(process.env.MYSQL_PORT || process.env.DB_PORT || '3306', 10);

  if (!databaseUrl && (password.includes('[YOUR-PASSWORD]') || host.includes('supabase'))) {
    return {
      success: true,
      message: `Seed notice: In-memory store already seeded with ${memoryStore.users.length} users, ${memoryStore.equipment.length} equipment, and ${memoryStore.calibrationRecords.length} calibration records.`,
    };
  }

  try {
    let connection: mysql.Connection;

    if (databaseUrl) {
      connection = await mysql.createConnection(databaseUrl);
    } else {
      connection = await mysql.createConnection({ host, user, password, database, port });
    }

    // 1. Clear existing sample data
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('TRUNCATE TABLE calibration_records;');
    await connection.query('TRUNCATE TABLE notifications;');
    await connection.query('TRUNCATE TABLE equipment;');
    await connection.query('TRUNCATE TABLE users;');
    await connection.query('TRUNCATE TABLE reminder_settings;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    // 2. Insert Users
    for (const u of memoryStore.users) {
      await connection.query(
        'INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [u.id, u.name, u.email, u.password_hash, u.role, u.created_at, u.updated_at]
      );
    }

    // 3. Insert Equipment
    for (const eq of memoryStore.equipment) {
      await connection.query(
        `INSERT INTO equipment (
          id, equipment_code, name, category, manufacturer, model_number, serial_number,
          location, department, purchase_date, calibration_interval_days,
          last_calibration_date, next_calibration_date, status, description, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eq.id,
          eq.equipment_code,
          eq.name,
          eq.category,
          eq.manufacturer,
          eq.model_number,
          eq.serial_number,
          eq.location,
          eq.department,
          eq.purchase_date,
          eq.calibration_interval_days,
          eq.last_calibration_date,
          eq.next_calibration_date,
          eq.status,
          eq.description,
          eq.created_by,
          eq.created_at,
          eq.updated_at,
        ]
      );
    }

    // 4. Insert Calibration Records
    for (const rec of memoryStore.calibrationRecords) {
      await connection.query(
        `INSERT INTO calibration_records (
          id, equipment_id, calibration_date, next_due_date, performed_by,
          calibration_provider, certificate_number, result, remarks,
          certificate_file_path, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rec.id,
          rec.equipment_id,
          rec.calibration_date,
          rec.next_due_date,
          rec.performed_by,
          rec.calibration_provider,
          rec.certificate_number,
          rec.result,
          rec.remarks,
          rec.certificate_file_path,
          rec.created_by,
          rec.created_at,
        ]
      );
    }

    // 5. Insert Notifications
    for (const n of memoryStore.notifications) {
      await connection.query(
        'INSERT INTO notifications (id, user_id, equipment_id, type, title, message, is_read, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [n.id, n.user_id, n.equipment_id, n.type, n.title, n.message, n.is_read, n.created_at]
      );
    }

    // 6. Insert Reminder Settings
    for (const r of memoryStore.reminderSettings) {
      await connection.query(
        'INSERT INTO reminder_settings (id, reminder_days_before, email_enabled, in_app_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [r.id, r.reminder_days_before, r.email_enabled, r.in_app_enabled, r.created_at, r.updated_at]
      );
    }

    await connection.end();
    console.log('[Seed] Database seeded with realistic data successfully!');
    return {
      success: true,
      message: `Seeded ${memoryStore.users.length} users, ${memoryStore.equipment.length} equipment, ${memoryStore.calibrationRecords.length} calibration records, and ${memoryStore.notifications.length} notifications.`,
    };
  } catch (error: any) {
    console.error('[Seed Error]', error.message);
    return { success: false, message: `Seeding failed: ${error.message}` };
  }
}

// Allow standalone execution via CLI (npm run db:seed)
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeed()
    .then((result) => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
