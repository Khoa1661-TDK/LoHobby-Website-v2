// scripts/ensure-payload-schema.ts
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv();

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS payload');
    console.log('[payload] schema "payload" is ready');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[payload] failed to ensure schema: ${message}`);
  process.exit(1);
});
