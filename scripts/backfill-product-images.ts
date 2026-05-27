// scripts/backfill-product-images.ts — snapshot media URLs onto existing products
import { config as loadEnv } from 'dotenv';

loadEnv();

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const { loadMediaDoc, mediaDocToStored } = await import('@/lib/product-image-snapshot');

  const payload = await getPayload({ config });

  const result = await payload.find({
    collection: 'products',
    limit: 500,
    pagination: false,
    overrideAccess: true,
    depth: 1,
  });

  let updated = 0;

  for (const doc of result.docs) {
    const title = typeof doc.title === 'string' ? doc.title : 'Sản phẩm';
    const data: Record<string, unknown> = {};

    const hasStored =
      typeof doc.storedImage === 'object' &&
      doc.storedImage !== null &&
      'url' in doc.storedImage &&
      typeof doc.storedImage.url === 'string' &&
      doc.storedImage.url.trim().length > 0;

    if (!hasStored && doc.image) {
      const media = await loadMediaDoc(payload, doc.image);
      const stored = mediaDocToStored(media, title);
      if (stored) data.storedImage = stored;
    }

    const gallery = Array.isArray(doc.gallery) ? doc.gallery : [];
    const needsGallery =
      !Array.isArray(doc.storedGallery) || doc.storedGallery.length === 0;

    if (needsGallery && gallery.length > 0) {
      const storedGallery = [];
      for (const item of gallery) {
        if (!item || typeof item !== 'object') continue;
        const media = await loadMediaDoc(payload, (item as { media?: unknown }).media);
        const stored = mediaDocToStored(media, title);
        if (stored) storedGallery.push(stored);
      }
      if (storedGallery.length > 0) data.storedGallery = storedGallery;
    }

    if (Object.keys(data).length === 0) continue;

    await payload.update({
      collection: 'products',
      id: doc.id,
      overrideAccess: true,
      data,
    });
    updated += 1;
    console.log(`[backfill] ${title}`);
  }

  console.log(`[backfill] Updated ${updated} product(s).`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[backfill] Failed: ${message}`);
  process.exit(1);
});
