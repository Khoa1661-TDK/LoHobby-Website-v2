// Read-only: counts rows that the localize_pages migration would touch, so we can
// judge whether the generated migration is safe or needs a hand-written backfill.
import { readFileSync } from 'node:fs';
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

const tables = [
  'payload.pages',
  'payload.pages_blocks_hero',
  'payload.pages_blocks_rich_text',
  'payload.pages_blocks_featured_products',
  'payload.pages_rels',
];

// meta_* columns that would be dropped — count rows where any is set (data at risk).
const metaTables = ['categories', 'products', 'blog_categories', 'posts', 'pages'];

await client.connect();
try {
  console.log('--- row counts (tables migration alters) ---');
  for (const t of tables) {
    try {
      const r = await client.query(`SELECT count(*)::int AS n FROM ${t}`);
      console.log(`${t}: ${r.rows[0].n}`);
    } catch (e) {
      console.log(`${t}: (error: ${e.message})`);
    }
  }
  console.log('--- rows with SEO meta set (would be dropped) ---');
  for (const t of metaTables) {
    try {
      const r = await client.query(
        `SELECT count(*)::int AS n FROM payload.${t} WHERE meta_title IS NOT NULL OR meta_description IS NOT NULL OR meta_image_id IS NOT NULL`,
      );
      console.log(`payload.${t} with meta: ${r.rows[0].n}`);
    } catch (e) {
      console.log(`payload.${t}: (error: ${e.message})`);
    }
  }
} finally {
  await client.end();
}
