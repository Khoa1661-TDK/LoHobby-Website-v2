// scripts/run-auto-sale-once.ts — run the auto-sale reconciliation immediately.
//
// Run with: node_modules/.bin/tsx --conditions=react-server scripts/run-auto-sale-once.ts
// The --conditions=react-server flag is required because lib/prisma.ts (imported
// transitively via lib/auto-sale/run.ts) imports 'server-only', which throws under
// plain tsx otherwise — see scripts/backfill-google-email-verified.ts for the same
// pre-existing condition.
import 'dotenv/config';
import config from '@payload-config';
import { getPayload } from 'payload';
import { runAutoSale } from '@/lib/auto-sale/run';

async function main(): Promise<void> {
  const payload = await getPayload({ config });
  const summary = await runAutoSale(payload);
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

void main();
