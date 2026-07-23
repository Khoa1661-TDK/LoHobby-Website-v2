// scripts/backfill-media-binaries.ts
// One-off recovery: repopulate the Postgres binary store (public.MediaFile) for
// existing Payload media records whose bytes were lost when store data moved
// between DB clusters. Product + media metadata is intact; only the binaries
// are gone, so every /admin/api/media/file/* request 404s and no product image
// renders. This re-downloads each image from its original Shopee CDN URL
// (scripts/data/shopee-catalog.json) and upserts it into MediaFile under the
// SAME filename Payload already stores, so the storefront resolves images
// again. Products, IDs, and manual edits are left untouched.
//
// Mapping: the original seed named each upload `${handle}-${i}` (cover/gallery)
// or `${handle}-var-${i}` (variant image), plus an extension. We rebuild that
// baseName -> source-URL map from the catalog, then for each media row strip the
// extension to recover the baseName and look up its URL. Media not produced by
// the catalog seed (logo, blog, page-builder uploads) has no Shopee source and
// is reported as unmatched — it needs a different recovery source.
//
// Usage (run inside the app container: it has tsx, the Prisma client, and DB
// network access):
//   docker cp scripts/backfill-media-binaries.ts ecommerce-web-app-1:/app/scripts/
//   docker exec ecommerce-web-app-1 node_modules/.bin/tsx scripts/backfill-media-binaries.ts --dry-run
//   docker exec ecommerce-web-app-1 node_modules/.bin/tsx scripts/backfill-media-binaries.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// How many images to download concurrently. Modest so we don't hammer the CDN
// or exhaust the DB pool with parallel upserts.
const CONCURRENCY = 8;

type CatalogVariant = { name: string; image: string | null };
type CatalogProduct = {
  handle: string;
  images: string[];
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

function stripExt(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot === -1 ? filename : filename.slice(0, dot);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');

  // 1. baseName -> source URL, rebuilt exactly how the seed named its uploads.
  const catalogPath = path.resolve(__dirname, 'data/shopee-catalog.json');
  const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8')) as CatalogProduct[];
  const urlByBase = new Map<string, string>();
  for (const p of catalog) {
    p.images.forEach((url, i) => urlByBase.set(`${p.handle}-${i}`, url));
    p.variants.forEach((v, i) => {
      if (v.image) urlByBase.set(`${p.handle}-var-${i}`, v.image);
    });
  }
  console.log(`[catalog] ${catalog.length} products -> ${urlByBase.size} source image URLs`);

  // 2. Every media record (the filenames the storefront actually requests).
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config });

  const media: { filename: string; mimeType: string }[] = [];
  let page = 1;
  for (;;) {
    const res = await payload.find({
      collection: 'media',
      limit: 200,
      page,
      depth: 0,
      overrideAccess: true,
      pagination: true,
    });
    for (const doc of res.docs) {
      const filename = (doc as { filename?: string }).filename;
      const mimeType = (doc as { mimeType?: string }).mimeType ?? 'image/jpeg';
      if (filename) media.push({ filename, mimeType });
    }
    if (!res.hasNextPage) break;
    page += 1;
  }
  console.log(`[media] ${media.length} media records`);

  // 3. Match each media row to a source URL; download + upsert the bytes.
  const { upsertMediaFile, hasMediaFile } = await import('@/lib/media-file-store');

  const matched: { filename: string; mimeType: string; url: string }[] = [];
  const unmatchedNames: string[] = [];
  for (const m of media) {
    const url = urlByBase.get(stripExt(m.filename));
    if (url) matched.push({ ...m, url });
    else unmatchedNames.push(m.filename);
  }
  console.log(`[match] ${matched.length} media map to a catalog URL, ${unmatchedNames.length} unmatched`);

  let restored = 0;
  let already = 0;
  let failed = 0;

  if (!dryRun) {
    for (let i = 0; i < matched.length; i += CONCURRENCY) {
      const batch = matched.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (m) => {
          // Cheap idempotency: skip rows already backfilled (safe to re-run).
          if (await hasMediaFile(m.filename)) {
            already += 1;
            return;
          }
          const img = await fetchImage(m.url);
          if (!img) {
            failed += 1;
            console.warn(`  ! download failed ${m.filename} <- ${m.url}`);
            return;
          }
          await upsertMediaFile({
            filename: m.filename,
            mimeType: m.mimeType || img.mimetype,
            data: new Uint8Array(img.buffer),
          });
          restored += 1;
          if (restored % 25 === 0) console.log(`  ...restored ${restored}`);
        }),
      );
    }
  }

  console.log(
    `\n[done] ${dryRun ? '(dry-run) ' : ''}restored ${restored}, ` +
      `already-present ${already}, failed ${failed}, unmatched ${unmatchedNames.length} of ${media.length}.`,
  );
  if (unmatchedNames.length) {
    console.log('[unmatched] media not from the Shopee catalog (need another source):');
    console.log(
      '  ' +
        unmatchedNames.slice(0, 20).join('\n  ') +
        (unmatchedNames.length > 20 ? `\n  ...+${unmatchedNames.length - 20} more` : ''),
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[fatal]', error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
