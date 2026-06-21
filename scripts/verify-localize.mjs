// Read-only: verify the localize_pages migration preserved data into the 'vi' locale.
import { readFileSync } from 'node:fs';
import pg from 'pg';

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  return line.slice('DATABASE_URL='.length).trim().replace(/^["']|["']$/g, '');
}

const { Client } = pg;
const client = new Client({ connectionString: databaseUrl() });
await client.connect();
try {
  const pl = await client.query(
    `SELECT _parent_id, _locale, title FROM "payload"."pages_locales" ORDER BY _parent_id, _locale`,
  );
  console.log('pages_locales rows:');
  for (const r of pl.rows) console.log(`  page ${r._parent_id} [${r._locale}]: ${JSON.stringify(r.title)}`);

  const hero = await client.query(`SELECT _locale, count(*)::int n FROM "payload"."pages_blocks_hero" GROUP BY _locale`);
  console.log('hero blocks by locale:', hero.rows);

  const rels = await client.query(`SELECT locale, count(*)::int n FROM "payload"."pages_rels" GROUP BY locale`);
  console.log('pages_rels by locale:', rels.rows);

  const nullLoc = await client.query(`SELECT count(*)::int n FROM "payload"."pages_blocks_hero" WHERE _locale IS NULL`);
  console.log('hero blocks with NULL locale (should be 0):', nullLoc.rows[0].n);
} finally {
  await client.end();
}
