// scripts/migrate-content-pages.ts — one-time copy of content-pages rows into the pages collection.
import 'dotenv/config';
import config from '@payload-config';
import { getPayload } from 'payload';
import { mapContentPageToPageData } from '@/lib/content-pages-migration';

async function main(): Promise<void> {
  const payload = await getPayload({ config });

  // content-pages may already be removed from config in a later step; guard for that.
  const hasContentPages = payload.config.collections.some((c) => c.slug === 'content-pages');
  if (!hasContentPages) {
    console.log('[migrate-content-pages] content-pages collection not registered — nothing to do.');
    return;
  }

  const source = await payload.find({
    collection: 'content-pages',
    limit: 1000,
    depth: 0,
    pagination: false,
  });

  if (source.docs.length === 0) {
    console.log('[migrate-content-pages] nothing to migrate (content-pages table is empty).');
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const doc of source.docs) {
    const mapped = mapContentPageToPageData(doc as never);
    if (!mapped.slug) {
      console.warn('[migrate-content-pages] skipping row with empty slug:', doc.id);
      skipped += 1;
      continue;
    }

    const existing = await payload.find({
      collection: 'pages',
      where: { slug: { equals: mapped.slug } },
      limit: 1,
      depth: 0,
      pagination: false,
    });

    if (existing.docs.length > 0) {
      console.warn(
        `[migrate-content-pages] slug "${mapped.slug}" already exists in pages — skipping (manual reconciliation needed).`,
      );
      skipped += 1;
      continue;
    }

    await payload.create({
      collection: 'pages',
      data: {
        title: mapped.title,
        slug: mapped.slug,
        status: mapped.status,
        layout: mapped.layout as never,
      },
    });
    migrated += 1;
    console.log(`[migrate-content-pages] migrated "${mapped.slug}" (${mapped.status}).`);
  }

  console.log(`[migrate-content-pages] done. migrated=${migrated} skipped=${skipped}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[migrate-content-pages] failed:', err);
    process.exit(1);
  });
