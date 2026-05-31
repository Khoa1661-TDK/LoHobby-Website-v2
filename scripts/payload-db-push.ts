// scripts/payload-db-push.ts — apply Payload schema changes (run after collection field edits)
import { config as loadEnv } from 'dotenv';

loadEnv();
process.env.PAYLOAD_DB_PUSH = 'true';

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config });
  console.log('[payload] schema push complete.');
  // Postgres pool keeps the event loop alive after push; do not await destroy (it can hang too).
  void payload.destroy().catch(() => undefined);
  process.exit(0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[payload] schema push failed: ${message}`);
  process.exit(1);
});
