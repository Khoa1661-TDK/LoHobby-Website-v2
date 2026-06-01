// lib/pg-pool.ts — shared PostgreSQL pool for fast Payload order writes
import 'server-only';

import pg from 'pg';

const globalForPg = globalThis as unknown as { pgPool?: pg.Pool };

function createPool(): pg.Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  return new pg.Pool({
    connectionString,
    max: 5,
    idle_in_transaction_session_timeout: 30_000,
  });
}

export function getPgPool(): pg.Pool {
  if (!globalForPg.pgPool) {
    globalForPg.pgPool = createPool();
  }
  return globalForPg.pgPool;
}
