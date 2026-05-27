// scripts/seed-payload-products.ts — seed Payload categories + products from prisma/products-catalog.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config as loadEnv } from 'dotenv';
import type { Payload } from 'payload';

loadEnv();

type CatalogProduct = {
  handle: string;
  title: string;
  description: string;
  priceVnd: number;
  currency: string;
  images: string[];
  available: boolean;
  tags: string[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLACEHOLDER_PATH = path.resolve(__dirname, '../public/images/placeholder.svg');

function getCategorySlug(product: CatalogProduct, categorySlugs: ReadonlySet<string>): string | null {
  for (const tag of product.tags) {
    if (tag !== 'all' && categorySlugs.has(tag)) return tag;
  }
  return null;
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

async function createProductMedia(
  payload: Payload,
  product: CatalogProduct,
  withRemoteImages: boolean,
): Promise<string | number> {
  let buffer: Buffer | null = null;
  let mimetype = 'image/jpeg';
  let name = `${product.handle}.jpg`;

  if (withRemoteImages) {
    const imageUrl = product.images[0];
    buffer = imageUrl ? await fetchImageBuffer(imageUrl) : null;
  }

  if (!buffer) {
    buffer = await fs.readFile(PLACEHOLDER_PATH);
    mimetype = 'image/svg+xml';
    name = 'placeholder.svg';
  }

  const doc = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt: product.title },
    file: {
      data: buffer,
      mimetype,
      name,
      size: buffer.length,
    },
  });

  return doc.id;
}

async function seedCategories(payload: Payload): Promise<Map<string, string | number>> {
  const { DEFAULT_CATEGORIES } = await import('@/lib/default-categories');
  const categoryIds = new Map<string, string | number>();

  for (const category of DEFAULT_CATEGORIES) {
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: category.slug } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    });

    if (existing.docs.length > 0) {
      const doc = existing.docs[0]!;
      await payload.update({
        collection: 'categories',
        id: doc.id,
        overrideAccess: true,
        data: {
          title: category.title,
          subtitle: category.subtitle,
        },
      });
      categoryIds.set(category.slug, doc.id);
      console.log(`[payload] category ready: ${category.slug}`);
      continue;
    }

    const doc = await payload.create({
      collection: 'categories',
      overrideAccess: true,
      data: {
        title: category.title,
        subtitle: category.subtitle,
        slug: category.slug,
      },
    });
    categoryIds.set(category.slug, doc.id);
    console.log(`[payload] created category: ${category.title}`);
  }

  return categoryIds;
}

async function seedProduct(
  payload: Payload,
  product: CatalogProduct,
  categoryIds: Map<string, string | number>,
  categorySlugs: ReadonlySet<string>,
  withRemoteImages: boolean,
): Promise<'created' | 'skipped' | 'failed'> {
  const categorySlug = getCategorySlug(product, categorySlugs);
  if (!categorySlug) {
    console.warn(`[payload] skip (no category): ${product.handle}`);
    return 'failed';
  }

  const categoryId = categoryIds.get(categorySlug);
  if (categoryId === undefined) {
    console.warn(`[payload] skip (missing category id): ${product.handle}`);
    return 'failed';
  }

  const existing = await payload.find({
    collection: 'products',
    where: { title: { equals: product.title } },
    limit: 1,
    pagination: false,
    overrideAccess: true,
  });

  if (existing.docs.length > 0) {
    return 'skipped';
  }

  const imageId = await createProductMedia(payload, product, withRemoteImages);

  await payload.create({
    collection: 'products',
    overrideAccess: true,
    data: {
      title: product.title,
      description: product.description,
      price: product.priceVnd,
      available: product.available,
      category: [categoryId],
      image: imageId,
    },
  });

  return 'created';
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let index = 0;

  async function next(): Promise<void> {
    const current = index;
    index += 1;
    if (current >= items.length) return;
    await worker(items[current]!, current);
    await next();
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => next()));
}

async function main(): Promise<void> {
  const catalogPath = path.resolve(__dirname, '../prisma/products-catalog.ts');
  const { CATALOG } = await import(pathToFileURL(catalogPath).href);
  const { DEFAULT_CATEGORY_SLUGS } = await import('@/lib/default-categories');
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.split('=')[1] ?? '', 10) : CATALOG.length;
  const products = Number.isFinite(limit) && limit > 0 ? CATALOG.slice(0, limit) : CATALOG;
  const withRemoteImages = process.argv.includes('--with-images');

  const payload = await getPayload({ config });
  const categoryIds = await seedCategories(payload);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  await runPool(products, withRemoteImages ? 4 : 8, async (product) => {
    const result = await seedProduct(
      payload,
      product,
      categoryIds,
      DEFAULT_CATEGORY_SLUGS,
      withRemoteImages,
    );
    if (result === 'created') {
      created += 1;
      console.log(`[payload] created product: ${product.title}`);
    } else if (result === 'skipped') {
      skipped += 1;
    } else {
      failed += 1;
    }
  });

  console.log(
    `[payload] product seed complete — created ${created}, skipped ${skipped}, failed ${failed}.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[payload] failed to seed products: ${message}`);
  process.exit(1);
});
