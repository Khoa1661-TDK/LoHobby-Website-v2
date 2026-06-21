// scripts/seed-home-page.ts — ensure a `home` page always exists (idempotent).
// Run: tsx scripts/seed-home-page.ts
import { config as loadEnv } from 'dotenv';
import type { Payload } from 'payload';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';

loadEnv();

// Bootstrapping behavior: the seed is authoritative for the `home` page. If a
// `home` page already exists (e.g. an older draft), it is UPDATED to a published
// page with the freshly designed layout — otherwise re-running could never heal a
// stale draft, and the storefront would keep falling back to the hardcoded home.
// Once you start editing the home page in the builder, stop running this seed.
export async function ensureHomePage(
  payload: Pick<Payload, 'find' | 'create' | 'update'>,
): Promise<'created' | 'updated'> {
  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    pagination: false,
  });

  const products = await payload.find({
    collection: 'products',
    limit: 8,
    sort: '-createdAt',
    pagination: false,
  });
  const featuredProductIds = products.docs.map((d) => String(d.id));

  const data = {
    title: 'Home',
    slug: 'home',
    status: 'published',
    layout: buildHomeSeedLayout({ featuredProductIds }) as never,
  };

  const current = existing.docs[0];
  if (current) {
    await payload.update({ collection: 'pages', id: current.id, data });
    return 'updated';
  }

  await payload.create({ collection: 'pages', data });
  return 'created';
}

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  const result = await ensureHomePage(payload);
  console.log(
    result === 'created'
      ? '[home-page] created (published).'
      : '[home-page] updated existing to published with fresh layout.',
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
