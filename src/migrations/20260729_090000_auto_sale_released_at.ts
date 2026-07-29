import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the `autoSaleReleasedAt` cooldown stamp to products. Written by hand
// rather than generated: `payload migrate:create` bundles unrelated
// destructive statements caused by pre-existing dev-database drift, and this
// change is one additive column. See the header of 20260726_120000_auto_sale_managed.ts.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."products" ADD COLUMN IF NOT EXISTS "auto_sale_released_at" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."products" DROP COLUMN IF EXISTS "auto_sale_released_at";
  `)
}
