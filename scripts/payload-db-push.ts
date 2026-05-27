// scripts/payload-db-push.ts — apply Payload schema changes (run after collection field edits)
import { config as loadEnv } from 'dotenv';

loadEnv();
process.env.PAYLOAD_DB_PUSH = 'true';

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  await getPayload({ config });
  console.log('[payload] schema push complete.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[payload] schema push failed: ${message}`);
  process.exit(1);
});
