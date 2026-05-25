// scripts/test-db-introspect.ts
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  const tables = await client.query<{ schema: string; name: string }>(`
    SELECT n.nspname AS schema, c.relname AS name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY 1, 2
  `);
  console.log('public tables:', tables.rows);

  // Subset of Prisma Studio column introspection (uses pg_catalog + json_agg)
  const columns = await client.query(`
    SELECT ns.nspname AS schema, cls.relname AS name
    FROM pg_catalog.pg_class AS cls
    INNER JOIN pg_catalog.pg_namespace AS ns ON cls.relnamespace = ns.oid
    WHERE ns.nspname = 'public' AND cls.relkind IN ('r', 'v')
    LIMIT 10
  `);
  console.log('studio tables query ok:', columns.rowCount);

  await client.end();
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error('FAILED:', error.message);
  } else {
    console.error('FAILED:', error);
  }
  process.exit(1);
});
