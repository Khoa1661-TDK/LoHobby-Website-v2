// scripts/db-schema-ready.ts
// Post-migration schema guard for the Docker entrypoint.
//
// Exit 0  -> Payload's schema is present: the boot may continue.
// Exit 1  -> the schema is missing (or unverifiable): the caller MUST abort.
//
// `payload migrate` exits 0 even when it applies nothing — declining its
// interactive prompt makes it call process.exit(0) with the schema never
// created. That turns a migration failure into Postgres 42P01 errors at
// runtime, on a page far from the cause. This check turns it back into a loud
// failure at boot. A raw `pg` query is used (no Payload boot) to stay fast.
import pg from 'pg';

// Tables every Payload build has, spanning core collections. If these are
// absent, migrations did not run — no build of this app omits them.
const REQUIRED_TABLES = ['products', 'users', 'store_settings'] as const;

async function main(): Promise<number> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[schema-guard] DATABASE_URL is unset');
    return 1;
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    // Payload's tables live in a dedicated schema (`payload` by default, see
    // payload.config.ts schemaName), NOT `public` — which holds Prisma's.
    const { rows } = await client.query<{ table_name: string }>(
      `SELECT DISTINCT table_name FROM information_schema.tables
       WHERE table_name = ANY($1::text[])`,
      [[...REQUIRED_TABLES]],
    );
    const found = new Set(rows.map((row) => row.table_name));
    const missing = REQUIRED_TABLES.filter((table) => !found.has(table));

    if (missing.length > 0) {
      console.error(`[schema-guard] missing tables: ${missing.join(', ')}`);
      return 1;
    }
    console.log('[schema-guard] payload schema present');
    return 0;
  } finally {
    await client.end();
  }
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[schema-guard] error: ${message}`);
    process.exit(1);
  });
