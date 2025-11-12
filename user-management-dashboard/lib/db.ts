import { Pool } from 'pg';

let pool: Pool | null = null;

function createPool(): Pool {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  if (!process.env.PG_HOST) {
    throw new Error('Database configuration missing: set DATABASE_URL or PG_* environment variables.');
  }

  return new Pool({
    host: process.env.PG_HOST,
    database: process.env.PG_DBNAME,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

export function getDb() {
  if (!pool) {
    pool = createPool();
  }
  return pool;
}

