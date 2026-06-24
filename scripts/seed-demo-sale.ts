// scripts/seed-demo-sale.ts — flag a curated demo set of products as on sale, so the
// /pages/sale promotions page and /search/on-sale listing render a populated grid.
// Idempotent: re-running just re-applies the same flags. Run: tsx scripts/seed-demo-sale.ts
import { config as loadEnv } from 'dotenv';
import type { Payload } from 'payload';

loadEnv();

// Curated demo markdowns, keyed by catalog handle so titles stay the single source of
// truth. A spread across categories keeps the sale page visually varied.
export const DEMO_SALE_PICKS: ReadonlyArray<{ handle: string; salePercent: number }> = [
  { handle: 'moc-khoa-logo-valorant', salePercent: 20 },
  { handle: 'mo-hinh-f22-raptor', salePercent: 25 },
  { handle: 'mo-hinh-f35-lightning', salePercent: 15 },
  { handle: 'tank-m1-abrams', salePercent: 30 },
  { handle: 'figure-toothless-mini', salePercent: 20 },
  { handle: 'do-choi-kiem-phat-sang', salePercent: 35 },
  { handle: 'qua-tang-hop-qua-hobby', salePercent: 40 },
];

type CatalogProduct = { handle: string; title: string };

export type SaleResult = { updated: number; missing: string[] };

// Resolve each pick's product by its catalog title and set onSale + salePercent. The
// Products collection's syncOnSaleCategory hook adds it to the "On Sale" category.
export async function applyDemoSale(
  payload: Pick<Payload, 'find' | 'update'>,
  catalog: ReadonlyArray<CatalogProduct>,
  picks: ReadonlyArray<{ handle: string; salePercent: number }> = DEMO_SALE_PICKS,
): Promise<SaleResult> {
  const titleByHandle = new Map(catalog.map((p) => [p.handle, p.title]));
  const result: SaleResult = { updated: 0, missing: [] };

  for (const pick of picks) {
    const title = titleByHandle.get(pick.handle);
    if (!title) {
      result.missing.push(pick.handle);
      continue;
    }

    const found = await payload.find({
      collection: 'products',
      where: { title: { equals: title } },
      limit: 1,
      pagination: false,
      overrideAccess: true,
    });

    const product = found.docs[0];
    if (!product) {
      result.missing.push(pick.handle);
      continue;
    }

    await payload.update({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
      data: { onSale: true, salePercent: pick.salePercent },
    });
    result.updated += 1;
  }

  return result;
}

async function main(): Promise<void> {
  const path = await import('node:path');
  const { fileURLToPath, pathToFileURL } = await import('node:url');
  const dir = path.dirname(fileURLToPath(import.meta.url));
  const catalogPath = path.resolve(dir, '../prisma/products-catalog.ts');
  const { CATALOG } = (await import(pathToFileURL(catalogPath).href)) as {
    CATALOG: CatalogProduct[];
  };

  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config });

  const result = await applyDemoSale(payload, CATALOG);
  console.log(`[demo-sale] marked ${result.updated} product(s) on sale.`);
  if (result.missing.length > 0) {
    console.warn(`[demo-sale] not found (seed products first): ${result.missing.join(', ')}`);
  }
}

if (process.argv[1] && process.argv[1].includes('seed-demo-sale')) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[demo-sale] failed: ${message}`);
    process.exit(1);
  });
}
