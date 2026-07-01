// scripts/db-needs-seed.ts
// First-boot seed guard for the Docker entrypoint.
//
// Exit 0  -> the store has no products yet (fresh/empty volume): caller SHOULD seed.
// Exit 1  -> products already exist, OR any error occurred: caller should NOT seed.
//
// Skipping on error is the safe failure: we never want to seed over an existing
// catalog or run a partial seed against a half-connected DB. A lightweight raw
// `pg` query is used (no Payload boot) so the check is fast.
import pg from 'pg';

async function main(): Promise<number> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[seed-guard] DATABASE_URL is unset — skipping seed');
    return 1;
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    // Payload's tables live in a dedicated schema (`payload` by default, see
    // payload.config.ts schemaName), NOT `public` — which holds the Prisma
    // tables. Resolve the products table's schema dynamically so the check is
    // correct regardless of the configured schema name. If it doesn't exist
    // yet, migrations haven't created it: treat as empty.
    const reg = await client.query<{ table_schema: string }>(
      `SELECT table_schema FROM information_schema.tables
       WHERE table_name = 'products'
       ORDER BY (table_schema = 'payload') DESC
       LIMIT 1`,
    );
    const schema = reg.rows[0]?.table_schema;
    if (!schema) {
      console.log('[seed-guard] products table absent — seeding needed');
      return 0;
    }

    const { rows } = await client.query<{ n: number }>(
      // schema comes from the catalog, not user input; quote it defensively.
      `SELECT count(*)::int AS n FROM "${schema}".products`,
    );
    const n = rows[0]?.n ?? 0;
    if (n === 0) {
      console.log('[seed-guard] 0 products — seeding needed');
      return 0;
    }
    console.log(`[seed-guard] ${n} products present — skipping seed`);
    return 1;
  } finally {
    await client.end();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[seed-guard] error: ${message} — skipping seed`);
    process.exit(1);
  });
