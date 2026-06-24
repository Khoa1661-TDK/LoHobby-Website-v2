// scripts/seed-deals-page.ts — ensure a `sale` promotions page always exists (idempotent).
// Run: tsx scripts/seed-deals-page.ts
import { config as loadEnv } from 'dotenv';
import type { Payload } from 'payload';
import { buildDealsSeedLayout } from '@/lib/page-builder/deals-seed';
import { ON_SALE_CATEGORY_SLUG } from '@/lib/default-categories';

loadEnv();

// Like the home seed, this is authoritative for the `sale` page: an existing page (even a
// stale draft) is UPDATED to a published page with the freshly designed layout, so
// re-running always heals it. Once you start editing the sale page in the builder, stop
// running this seed.
export async function ensureDealsPage(
  payload: Pick<Payload, 'find' | 'create' | 'update'>,
): Promise<'created' | 'updated'> {
  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'sale' } },
    limit: 1,
    pagination: false,
  });

  // Resolve the auto-managed On Sale category so the FeaturedCollection binds to the live
  // discounted-items source. Absent (no on-sale products yet) is fine — the layout still
  // renders, just without a curated source until the category is created.
  const onSaleCategory = await payload.find({
    collection: 'categories',
    where: { slug: { equals: ON_SALE_CATEGORY_SLUG } },
    limit: 1,
    pagination: false,
  });
  const onSaleCategoryId = onSaleCategory.docs[0]?.id ?? null;

  const data = {
    title: 'Sale',
    slug: 'sale',
    status: 'published',
    layout: buildDealsSeedLayout({ onSaleCategoryId }) as never,
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

  const result = await ensureDealsPage(payload);
  console.log(
    result === 'created'
      ? '[deals-page] created (published) at /pages/sale.'
      : '[deals-page] updated existing to published with fresh layout.',
  );
}

// CLI runner — only executes when invoked directly (e.g. `tsx scripts/seed-deals-page.ts`),
// so importing this module from a test does not trigger a live Payload bootstrap.
if (process.argv[1] && process.argv[1].includes('seed-deals-page')) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[deals-page] seed failed: ${message}`);
    process.exit(1);
  });
}
