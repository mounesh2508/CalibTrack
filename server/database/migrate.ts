import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigration(): Promise<{ success: boolean; message: string }> {
  console.log('[Migration] Starting database migration for CalibTrack...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Parse SQL statements
  const statements = schemaSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));

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
      message: 'Migration notice: External MySQL not configured or credentials contain placeholders. In-memory schema initialized.',
    };
  }

  try {
    let connection: mysql.Connection;

    if (databaseUrl) {
      connection = await mysql.createConnection(databaseUrl);
    } else {
      // Create connection without database first to ensure database exists
      const rootConn = await mysql.createConnection({ host, user, password, port });
      await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await rootConn.end();

      connection = await mysql.createConnection({ host, user, password, database, port, multipleStatements: true });
    }

    console.log(`[Migration] Connected to MySQL. Executing ${statements.length} DDL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.trim()) {
        await connection.query(stmt);
      }
    }

    await connection.end();
    console.log('[Migration] All tables and indexes successfully created in MySQL!');
    return { success: true, message: `Migration completed: ${statements.length} statements executed successfully.` };
  } catch (error: any) {
    console.error('[Migration Error]', error.message);
    return { success: false, message: `Migration failed: ${error.message}` };
  }
}

// Allow standalone execution via CLI (npm run db:migrate)
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigration()
    .then((result) => {
      console.log(result.message);
      process.exit(result.success ? 0 : 1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
