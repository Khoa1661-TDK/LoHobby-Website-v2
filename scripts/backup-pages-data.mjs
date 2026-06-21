// Read-only JSON snapshot of every payload table the localize_pages migration
// touches (all `pages%` tables), written to /tmp so we can restore by hand if needed.
import { readFileSync, writeFileSync } from 'node:fs';
import pg from 'pg';

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!line) throw new Error('DATABASE_URL not found in env or .env');
  return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

const { Client } = pg;
const client = new Client({ connectionString: databaseUrl() });
await client.connect();
try {
  const { rows: tbls } = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'payload' AND tablename LIKE 'pages%' ORDER BY tablename`,
  );
  const dump = {};
  for (const { tablename } of tbls) {
    const { rows } = await client.query(`SELECT * FROM "payload"."${tablename}"`);
    dump[tablename] = rows;
  }
  const file = `/tmp/payload-pages-backup-${Date.now()}.json`;
  writeFileSync(file, JSON.stringify(dump, null, 2));
  console.log(`Backed up ${tbls.length} tables to ${file}`);
  for (const t of tbls) console.log(`  ${t.tablename}: ${dump[t.tablename].length} rows`);
} finally {
  await client.end();
}
