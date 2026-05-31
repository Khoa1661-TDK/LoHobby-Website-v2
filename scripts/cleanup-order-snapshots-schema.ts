// scripts/cleanup-order-snapshots-schema.ts — remove legacy order-snapshots schema before db-push
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv();

const SCHEMA = 'payload';

async function run(client: Client, sql: string, label: string): Promise<void> {
  try {
    await client.query(sql);
    console.log(`[cleanup] ${label}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[cleanup] skip ${label}: ${message}`);
  }
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    const fkRows = await client.query<{
      table_name: string;
      constraint_name: string;
    }>(
      `
      SELECT DISTINCT tc.table_name, tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
        AND kcu.table_schema = tc.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.table_schema = $1
        AND tc.constraint_type = 'FOREIGN KEY'
        AND (
          tc.constraint_name ILIKE '%order_snapshots%'
          OR ccu.table_name = 'order_snapshots'
          OR kcu.column_name ILIKE '%order_snapshots%'
        )
      `,
      [SCHEMA],
    );

    for (const row of fkRows.rows) {
      await run(
        client,
        `ALTER TABLE "${SCHEMA}"."${row.table_name}" DROP CONSTRAINT IF EXISTS "${row.constraint_name}"`,
        `dropped FK ${row.constraint_name} on ${row.table_name}`,
      );
    }

    const colRows = await client.query<{ table_name: string; column_name: string }>(
      `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = $1
        AND column_name ILIKE '%order_snapshots%'
      `,
      [SCHEMA],
    );

    for (const row of colRows.rows) {
      await run(
        client,
        `ALTER TABLE "${SCHEMA}"."${row.table_name}" DROP COLUMN IF EXISTS "${row.column_name}" CASCADE`,
        `dropped column ${row.table_name}.${row.column_name}`,
      );
    }

    await run(
      client,
      `DROP TABLE IF EXISTS "${SCHEMA}"."order_snapshots_line_items" CASCADE`,
      'dropped table order_snapshots_line_items',
    );
    await run(
      client,
      `DROP TABLE IF EXISTS "${SCHEMA}"."order_snapshots" CASCADE`,
      'dropped table order_snapshots',
    );

    console.log('[cleanup] order-snapshots legacy schema removed. Re-run: pnpm payload:db-push');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[cleanup] failed: ${message}`);
  process.exit(1);
});
