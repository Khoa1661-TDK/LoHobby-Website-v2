// scripts/import-shopee-prices.ts
// Import real Shopee prices into Payload products + variants.
//
// Source data: scripts/data/shopee-prices.json (generated from the Shopee
// "mass_update_sales_info" .xlsx export). Each entry has:
//   - shopeeId:      Shopee product id (embedded in seeded variant SKUs)
//   - title:         product title (exact match for variant-less products)
//   - basePrice:     VND integer -> products.price (cheapest variation = "from" price)
//   - variantPrices: { [variantName]: VND } -> product-variants.priceOverride
//
// Matching strategy (products were seeded by scripts/seed-shopee-catalog.ts,
// which carried a 100,000 VND placeholder price and no Shopee id field):
//   1. Products WITH variants: locate via variant SKU prefix `sp-<shopeeId>-`,
//      then read product id off the variant. Match each variant by `name`.
//   2. Variant-less products: locate by exact `title` (all titles are unique).
//
// Safety: dry-run by default. Pass --apply to write. Pass --limit=N to scope.
//
// Usage:
//   tsx scripts/import-shopee-prices.ts             # dry run (no writes)
//   tsx scripts/import-shopee-prices.ts --apply     # write prices
//   tsx scripts/import-shopee-prices.ts --apply --limit=5
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import type { Payload } from 'payload';

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

type PriceEntry = {
  shopeeId: string;
  title: string;
  basePrice: number;
  variantPrices: Record<string, number>;
};

const APPLY = process.argv.includes('--apply');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? Number.parseInt(limitArg.split('=')[1] ?? '', 10) : undefined;

type VariantDoc = { id: number; name: string; sku: string; priceOverride?: number | null };

/** Find a product + its variants via the seeded SKU prefix `sp-<shopeeId>-`. */
async function findByVariantSku(
  payload: Payload,
  shopeeId: string,
): Promise<{ productId: number; variants: VariantDoc[] } | null> {
  const res = await payload.find({
    collection: 'product-variants',
    where: { sku: { like: `sp-${shopeeId}-` } },
    limit: 200,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  const docs = res.docs as Array<VariantDoc & { product: number | { id: number } }>;
  if (docs.length === 0) return null;
  const first = docs[0]!;
  const productId = typeof first.product === 'object' ? first.product.id : first.product;
  return {
    productId,
    variants: docs.map((d) => ({ id: d.id, name: d.name, sku: d.sku, priceOverride: d.priceOverride })),
  };
}

/** Fallback for variant-less products: exact title match. */
async function findByTitle(payload: Payload, title: string): Promise<number | null> {
  const res = await payload.find({
    collection: 'products',
    where: { title: { equals: title } },
    limit: 2,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  });
  if (res.docs.length === 0) return null;
  if (res.docs.length > 1) {
    console.warn(`    ! title not unique, using first: "${title.slice(0, 40)}"`);
  }
  return res.docs[0]!.id as number;
}

async function main(): Promise<void> {
  const dataPath = path.resolve(__dirname, 'data/shopee-prices.json');
  const raw = await fs.readFile(dataPath, 'utf8');
  let entries = JSON.parse(raw) as PriceEntry[];
  if (LIMIT && LIMIT > 0) entries = entries.slice(0, LIMIT);

  console.log(
    `[mode] ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes — pass --apply to write)'} — ${entries.length} products\n`,
  );

  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config });

  let productsUpdated = 0;
  let variantsUpdated = 0;
  const notFound: string[] = [];
  const unmatchedVariants: string[] = [];

  for (const e of entries) {
    const hasVariantPrices = Object.keys(e.variantPrices).length > 0;
    const found = await findByVariantSku(payload, e.shopeeId);

    let productId: number | null = null;
    let variants: VariantDoc[] = [];

    if (found) {
      productId = found.productId;
      variants = found.variants;
    } else {
      // Variant-less product (no seeded variant rows) — match by title.
      productId = await findByTitle(payload, e.title);
    }

    if (productId === null) {
      notFound.push(`${e.shopeeId} — ${e.title.slice(0, 50)}`);
      continue;
    }

    // 1. Product base price.
    if (APPLY) {
      await payload.update({
        collection: 'products',
        id: productId,
        data: { price: e.basePrice },
        depth: 0,
        overrideAccess: true,
      });
    }
    productsUpdated += 1;
    console.log(
      `[${productsUpdated}] ${e.title.slice(0, 48)} -> ${e.basePrice.toLocaleString('vi-VN')}₫` +
        (hasVariantPrices ? ` (+${Object.keys(e.variantPrices).length} variant prices)` : ''),
    );

    // 2. Per-variant overrides (match by name).
    if (hasVariantPrices) {
      for (const [name, price] of Object.entries(e.variantPrices)) {
        const variant = variants.find((v) => v.name === name);
        if (!variant) {
          unmatchedVariants.push(`${e.shopeeId} "${name}"`);
          continue;
        }
        if (APPLY) {
          await payload.update({
            collection: 'product-variants',
            id: variant.id,
            data: { priceOverride: price },
            depth: 0,
            overrideAccess: true,
          });
        }
        variantsUpdated += 1;
      }
    }
  }

  console.log(`\n[summary]`);
  console.log(`  products ${APPLY ? 'updated' : 'matched'}: ${productsUpdated}/${entries.length}`);
  console.log(`  variant prices ${APPLY ? 'set' : 'matched'}: ${variantsUpdated}`);
  if (notFound.length) {
    console.log(`  NOT FOUND in DB (${notFound.length}):`);
    for (const n of notFound) console.log(`    - ${n}`);
  }
  if (unmatchedVariants.length) {
    console.log(`  variant name not matched in DB (${unmatchedVariants.length}):`);
    for (const n of unmatchedVariants) console.log(`    - ${n}`);
  }
  if (!APPLY) console.log(`\n[dry run] no changes written. Re-run with --apply to write.`);

  process.exit(notFound.length > 0 ? 1 : 0);
}

// Exit explicitly on success. Payload holds an open Postgres pool, so the event
// loop never drains on its own and the process would hang here forever —
// blocking docker/entrypoint.sh, which runs these seeds sequentially before
// starting the server. Only the failure path used to exit, so a seed that
// WORKED hung the boot while a seed that FAILED let it continue.
main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[fatal] ${message}`);
    process.exit(1);
  });
