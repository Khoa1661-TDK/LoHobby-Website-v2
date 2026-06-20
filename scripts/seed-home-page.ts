// scripts/seed-home-page.ts — ensure a `home` page always exists (idempotent).
// Run: tsx scripts/seed-home-page.ts
import { config as loadEnv } from 'dotenv';
import type { Payload } from 'payload';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';

loadEnv();

export async function ensureHomePage(
  payload: Pick<Payload, 'find' | 'create'>,
): Promise<'created' | 'exists'> {
  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    pagination: false,
  });

  if (existing.docs.length > 0) {
    return 'exists';
  }

  await payload.create({
    collection: 'pages',
    data: {
      title: 'Home',
      slug: 'home',
      status: 'draft',
      layout: buildHomeSeedLayout() as never,
    },
  });
  return 'created';
}

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  const result = await ensureHomePage(payload);
  console.log(
    result === 'created'
      ? '[home-page] created.'
      : '[home-page] already exists — skipped.',
  );
}

// CLI runner — only executes when invoked directly (e.g. `tsx scripts/seed-home-page.ts`),
// so importing this module from a test does not trigger a live Payload bootstrap.
if (process.argv[1] && process.argv[1].includes('seed-home-page')) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[home-page] seed failed: ${message}`);
    process.exit(1);
  });
}
