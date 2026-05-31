// scripts/ensure-product-variants-schema.ts — fix DB for product-variants relationship field
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

loadEnv();

type LegacyRow = {
  _parent_id: number;
  id: number;
  name: string;
  sku: string;
  price_override: number | null;
  stock: number;
  image_id: number | null;
};

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await client.query('CREATE SCHEMA IF NOT EXISTS payload');

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'payload'
            AND table_name = 'products_rels'
            AND column_name = 'product_variants_id'
        ) THEN
          ALTER TABLE payload.products_rels
            ADD COLUMN product_variants_id integer;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payload.product_variants (
        id serial PRIMARY KEY,
        product_id integer NOT NULL,
        name varchar NOT NULL,
        sku varchar NOT NULL,
        price_override numeric,
        stock numeric DEFAULT 0 NOT NULL,
        image_id integer,
        updated_at timestamp(3) with time zone DEFAULT now() NOT NULL,
        created_at timestamp(3) with time zone DEFAULT now() NOT NULL
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_idx
      ON payload.product_variants (sku);
    `);

    const tableCheck = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'payload' AND table_name = 'products_variants'`,
    );

    if (tableCheck.rowCount && tableCheck.rowCount > 0) {
      const legacy = await client.query<LegacyRow>(
        `SELECT _parent_id, id, name, sku, price_override, stock, image_id
         FROM payload.products_variants
         ORDER BY _parent_id, _order`,
      );

      for (const row of legacy.rows) {
        const inserted = await client.query<{ id: number }>(
          `INSERT INTO payload.product_variants (product_id, name, sku, price_override, stock, image_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (sku) DO NOTHING
           RETURNING id`,
          [
            row._parent_id,
            row.name,
            row.sku,
            row.price_override,
            row.stock ?? 0,
            row.image_id,
          ],
        );

        const variantId = inserted.rows[0]?.id;
        if (!variantId) continue;

        const relExists = await client.query(
          `SELECT 1 FROM payload.products_rels
           WHERE parent_id = $1 AND path = 'variants' AND product_variants_id = $2`,
          [row._parent_id, variantId],
        );

        if ((relExists.rowCount ?? 0) === 0) {
          const orderResult = await client.query<{ next: number }>(
            `SELECT COALESCE(MAX("order"), -1) + 1 AS next
             FROM payload.products_rels
             WHERE parent_id = $1 AND path = 'variants'`,
            [row._parent_id],
          );
          const order = orderResult.rows[0]?.next ?? 0;

          await client.query(
            `INSERT INTO payload.products_rels (parent_id, path, "order", product_variants_id)
             VALUES ($1, 'variants', $2, $3)`,
            [row._parent_id, order, variantId],
          );
        }
      }

      if (legacy.rows.length > 0) {
        console.log(`[schema] migrated ${legacy.rows.length} legacy inline variant row(s).`);
      }
    }

    console.log('[schema] products_rels.product_variants_id is ready.');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('[schema] failed:', error);
  process.exit(1);
});
