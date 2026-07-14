import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Reworks the Spotlight block from a single embedded product into a `deals` array
// (one slide per deal) plus block-level autoplay controls. The per-deal fields move
// from the parent `pages_blocks_spotlight` table into a new child table
// `pages_blocks_spotlight_deals`; existing spotlight rows have their single product
// copied into a first deal row so no authored content is lost.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TABLE "payload"."pages_blocks_spotlight_deals" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"heading" varchar,
  	"description" varchar,
  	"discount_label" varchar,
  	"price_now" varchar,
  	"price_was" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"target_date" varchar,
  	"expired_text" varchar DEFAULT 'This deal has ended.'
  );

  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "autoplay" boolean DEFAULT true;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "autoplay_seconds" numeric DEFAULT 6;

  ALTER TABLE "payload"."pages_blocks_spotlight_deals" ADD CONSTRAINT "pages_blocks_spotlight_deals_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_spotlight_deals" ADD CONSTRAINT "pages_blocks_spotlight_deals_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_spotlight"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_spotlight_deals_order_idx" ON "payload"."pages_blocks_spotlight_deals" USING btree ("_order");
  CREATE INDEX "pages_blocks_spotlight_deals_parent_id_idx" ON "payload"."pages_blocks_spotlight_deals" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_spotlight_deals_locale_idx" ON "payload"."pages_blocks_spotlight_deals" USING btree ("_locale");
  CREATE INDEX "pages_blocks_spotlight_deals_product_idx" ON "payload"."pages_blocks_spotlight_deals" USING btree ("product_id");

  -- Preserve existing content: copy each spotlight's single product into a first deal row.
  INSERT INTO "payload"."pages_blocks_spotlight_deals"
  	("_order", "_parent_id", "_locale", "id", "product_id", "heading", "description", "discount_label", "price_now", "price_was", "cta_label", "cta_href", "target_date", "expired_text")
  SELECT 1, "id", "_locale", gen_random_uuid()::varchar, "product_id", "heading", "description", "discount_label", "price_now", "price_was", "cta_label", "cta_href", "target_date", "expired_text"
  FROM "payload"."pages_blocks_spotlight"
  WHERE "product_id" IS NOT NULL OR "heading" IS NOT NULL OR "price_now" IS NOT NULL;

  ALTER TABLE "payload"."pages_blocks_spotlight" DROP CONSTRAINT IF EXISTS "pages_blocks_spotlight_product_id_products_id_fk";
  DROP INDEX IF EXISTS "payload"."pages_blocks_spotlight_product_idx";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "product_id";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "heading";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "description";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "discount_label";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "price_now";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "price_was";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "cta_label";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "cta_href";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "target_date";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "expired_text";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "product_id" integer;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "heading" varchar;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "description" varchar;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "discount_label" varchar;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "price_now" varchar;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "price_was" varchar;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "cta_label" varchar;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "cta_href" varchar;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "target_date" varchar;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD COLUMN "expired_text" varchar DEFAULT 'This deal has ended.';

  -- Restore the single product from the first deal row (later deals cannot be preserved).
  UPDATE "payload"."pages_blocks_spotlight" p
  SET
  	"product_id" = d."product_id",
  	"heading" = d."heading",
  	"description" = d."description",
  	"discount_label" = d."discount_label",
  	"price_now" = d."price_now",
  	"price_was" = d."price_was",
  	"cta_label" = d."cta_label",
  	"cta_href" = d."cta_href",
  	"target_date" = d."target_date",
  	"expired_text" = d."expired_text"
  FROM "payload"."pages_blocks_spotlight_deals" d
  WHERE d."_parent_id" = p."id" AND d."_order" = 1;

  ALTER TABLE "payload"."pages_blocks_spotlight" ADD CONSTRAINT "pages_blocks_spotlight_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_spotlight_product_idx" ON "payload"."pages_blocks_spotlight" USING btree ("product_id");

  DROP TABLE "payload"."pages_blocks_spotlight_deals" CASCADE;
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "autoplay";
  ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN "autoplay_seconds";`)
}
