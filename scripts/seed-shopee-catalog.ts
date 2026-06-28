// scripts/seed-shopee-catalog.ts
// Import the real shop catalog (exported from Shopee) into Payload.
//
// Source data: scripts/data/shopee-catalog.json (generated from the two
// mass_update_*.xlsx exports). Each entry has title, description, a mapped
// storefront category slug, Shopee CDN image URLs (cover + gallery), and an
// optional single variation group ("Màu" etc.) with options.
//
// What this script does:
//   1. (default) deletes every existing product + variant — clears the demo /
//      "template" products so the store contains only this catalog. Pass
//      --keep-existing to skip the reset.
//   2. ensures the storefront categories used by the catalog exist.
//   3. downloads each product's images into the Media collection.
//   4. creates the product with a PLACEHOLDER price (Shopee exports carry no
//      price) and links category + main image + gallery.
//   5. creates a ProductVariant per variation option (unique generated SKU,
//      placeholder stock — the variant schema requires a stock number).
//   6. writes the image snapshot fields so the storefront renders images
//      immediately (same work the product afterChange hook debounces).
//
// Usage:
//   tsx scripts/seed-shopee-catalog.ts                 # full reset + import
//   tsx scripts/seed-shopee-catalog.ts --keep-existing # import only
//   tsx scripts/seed-shopee-catalog.ts --limit=5       # first 5 (smoke test)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import type { Payload } from 'payload';
import { slugifyVietnamese } from '@/lib/slugify';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Placeholder price in VND — Shopee exports have no price. Editable per product
// in the admin afterwards.
const PLACEHOLDER_PRICE_VND = 100_000;
// Variant stock is a required field with no "unlimited" option (unlike the
// product-level stock). Seed a placeholder so variants are purchasable.
const PLACEHOLDER_VARIANT_STOCK = 100;

type CatalogVariant = { name: string; image: string | null };
type CatalogProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  categorySlug: string;
  sku: string | null;
  images: string[];
  variationName: string | null;
  variants: CatalogVariant[];
};

async function fetchImage(url: string): Promise<{ buffer: Buffer; mimetype: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25_000) });
    if (!res.ok) return null;
    const mimetype = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg';
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length === 0) return null;
    return { buffer, mimetype };
  } catch {
    return null;
  }
}

function extFor(mimetype: string): string {
  if (mimetype.includes('png')) return 'png';
  if (mimetype.includes('webp')) return 'webp';
  if (mimetype.includes('gif')) return 'gif';
  return 'jpg';
}

async function uploadImage(
  payload: Payload,
  url: string,
  alt: string,
  baseName: string,
): Promise<number | null> {
  const img = await fetchImage(url);
  if (!img) {
    console.warn(`    ! image download failed: ${url}`);
    return null;
  }
  const doc = await payload.create({
    collection: 'media',
    overrideAccess: true,
    data: { alt },
    file: {
      data: img.buffer,
      mimetype: img.mimetype,
      name: `${baseName}.${extFor(img.mimetype)}`,
      size: img.buffer.length,
    },
  });
  return doc.id as number;
}

async function resetProducts(payload: Payload): Promise<void> {
  const variants = await payload.delete({
    collection: 'product-variants',
    where: { id: { exists: true } },
    overrideAccess: true,
  });
  const products = await payload.delete({
    collection: 'products',
    where: { id: { exists: true } },
    overrideAccess: true,
  });
  const vCount = Array.isArray(variants?.docs) ? variants.docs.length : 0;
  const pCount = Array.isArray(products?.docs) ? products.docs.length : 0;
  console.log(`[reset] deleted ${pCount} existing products and ${vCount} variants.`);
}

async function ensureCategories(
  payload: Payload,
  slugs: ReadonlySet<string>,
): Promise<Map<string, number>> {
  const { DEFAULT_CATEGORIES } = await import('@/lib/default-categories');
  const ids = new Map<string, number>();

  for (const category of DEFAULT_CATEGORIES) {
    if (!slugs.has(category.slug)) continue;
    const existing = await payload.find({
      collection: 'categories',
      where: { slug: { equals: category.slug } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    });
    if (existing.docs.length > 0) {
      ids.set(category.slug, existing.docs[0]!.id as number);
      continue;
    }
    const doc = await payload.create({
      collection: 'categories',
      overrideAccess: true,
      data: { title: category.title, subtitle: category.subtitle, slug: category.slug },
    });
    ids.set(category.slug, doc.id as number);
    console.log(`[category] created: ${category.title} (${category.slug})`);
  }
  return ids;
}

async function seedProduct(
  payload: Payload,
  product: CatalogProduct,
  categoryId: number,
): Promise<void> {
  // Download all images first (cover + gallery).
  const mediaIds: number[] = [];
  for (let i = 0; i < product.images.length; i++) {
    const id = await uploadImage(
      payload,
      product.images[i]!,
      product.title,
      `${product.handle}-${i}`,
    );
    if (id !== null) mediaIds.push(id);
  }

  const [coverId, ...galleryIds] = mediaIds;
  if (coverId === undefined) {
    throw new Error(`no images downloaded for ${product.handle}`);
  }

  const created = await payload.create({
    collection: 'products',
    overrideAccess: true,
    data: {
      title: product.title,
      description: product.description || undefined,
      price: PLACEHOLDER_PRICE_VND,
      available: true,
      category: [categoryId],
      image: coverId,
      gallery: galleryIds.map((media) => ({ media })),
    },
  });

  // Variants: one per Shopee option. SKU must be globally unique.
  for (let i = 0; i < product.variants.length; i++) {
    const variant = product.variants[i]!;
    let imageId: number | null = null;
    if (variant.image) {
      imageId = await uploadImage(
        payload,
        variant.image,
        `${product.title} — ${variant.name}`,
        `${product.handle}-var-${i}`,
      );
    }
    await payload.create({
      collection: 'product-variants',
      overrideAccess: true,
      data: {
        product: created.id,
        name: variant.name,
        sku: `${product.handle}-${slugifyVietnamese(variant.name) || 'opt'}-${i}`,
        stock: PLACEHOLDER_VARIANT_STOCK,
        ...(imageId !== null ? { image: imageId } : {}),
      },
    });
  }

  // Write image snapshots so the storefront renders images right away.
  const { buildProductSnapshotPatch } = await import('@/lib/product-snapshot-patch');
  const { SNAPSHOT_BACKFILL_CONTEXT } = await import('@/lib/payload-hooks');
  const fresh = await payload.findByID({
    collection: 'products',
    id: created.id,
    depth: 0,
    overrideAccess: true,
  });
  const patch = await buildProductSnapshotPatch(
    payload,
    fresh as Parameters<typeof buildProductSnapshotPatch>[1],
    { useRetry: true },
  );
  if (patch) {
    await payload.update({
      collection: 'products',
      id: created.id,
      data: patch,
      context: SNAPSHOT_BACKFILL_CONTEXT,
      depth: 0,
      overrideAccess: true,
    });
  }
}

async function main(): Promise<void> {
  const catalogPath = path.resolve(__dirname, 'data/shopee-catalog.json');
  const raw = await fs.readFile(catalogPath, 'utf8');
  const catalog = JSON.parse(raw) as CatalogProduct[];

  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.split('=')[1] ?? '', 10) : catalog.length;
  const products =
    Number.isFinite(limit) && limit > 0 ? catalog.slice(0, limit) : catalog;
  const keepExisting = process.argv.includes('--keep-existing');

  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config });

  if (!keepExisting) {
    await resetProducts(payload);
  }

  const usedSlugs = new Set(products.map((p) => p.categorySlug));
  const categoryIds = await ensureCategories(payload, usedSlugs);

  let created = 0;
  let failed = 0;
  for (const product of products) {
    const categoryId = categoryIds.get(product.categorySlug);
    if (categoryId === undefined) {
      console.warn(`[skip] missing category ${product.categorySlug} for ${product.title}`);
      failed += 1;
      continue;
    }
    try {
      await seedProduct(payload, product, categoryId);
      created += 1;
      console.log(
        `[ok ${created}/${products.length}] ${product.title.slice(0, 50)} ` +
          `(${product.images.length} imgs, ${product.variants.length} variants)`,
      );
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[fail] ${product.title.slice(0, 50)}: ${message}`);
    }
  }

  console.log(`\n[done] created ${created}, failed ${failed} of ${products.length}.`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[fatal] ${message}`);
  process.exit(1);
});
