// scripts/migrate-inline-product-variants.ts — move legacy inline variants to product-variants collection
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv();

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const { default: payloadConfig } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config: payloadConfig });

  type LegacyRow = {
    _parent_id: number;
    id: number;
    name: string;
    sku: string;
    price_override: number | null;
    stock: number;
    image_id: number | null;
  };

  let legacyRows: LegacyRow[] = [];

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(
      `SELECT _parent_id, id, name, sku, price_override, stock, image_id
       FROM payload.products_variants
       ORDER BY _parent_id, _order`,
    );
    legacyRows = result.rows as LegacyRow[];
  } catch (error) {
    console.log('[migrate] could not read payload.products_variants:', error);
    return;
  } finally {
    await client.end();
  }

  if (legacyRows.length === 0) {
    console.log('[migrate] no legacy inline variants found.');
    return;
  }

  const byProduct = new Map<number, LegacyRow[]>();
  for (const row of legacyRows) {
    const list = byProduct.get(row._parent_id) ?? [];
    list.push(row);
    byProduct.set(row._parent_id, list);
  }

  let created = 0;

  for (const [productId, rows] of byProduct) {
    const linkedIds: number[] = [];

    for (const row of rows) {
      const doc = await payload.create({
        collection: 'product-variants',
        data: {
          product: productId,
          name: row.name,
          sku: row.sku,
          priceOverride: row.price_override ?? undefined,
          stock: row.stock ?? 0,
          image: row.image_id ?? undefined,
        },
        overrideAccess: true,
      });
      if (doc?.id) {
        linkedIds.push(Number(doc.id));
        created += 1;
      }
    }

    await payload.update({
      collection: 'products',
      id: productId,
      data: { variants: linkedIds },
      overrideAccess: true,
      depth: 0,
    });

    console.log(`[migrate] product ${productId}: ${linkedIds.length} variant(s)`);
  }

  console.log(`[migrate] created ${created} product-variant document(s).`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error('[migrate] failed:', error);
  process.exit(1);
});
