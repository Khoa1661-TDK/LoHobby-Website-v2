import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- ── Add localized columns to the existing products_locales / categories_locales
  --    tables (they already exist for the SEO meta fields). Add as NULLABLE first so
  --    the backfill can populate them before NOT NULL is enforced. ──
  ALTER TABLE "payload"."products_locales" ADD COLUMN "title" varchar;
  ALTER TABLE "payload"."products_locales" ADD COLUMN "description" varchar;
  ALTER TABLE "payload"."categories_locales" ADD COLUMN "title" varchar;
  ALTER TABLE "payload"."categories_locales" ADD COLUMN "subtitle" varchar;

  -- ── product_variants_locales does not exist yet: create it fresh. ──
  CREATE TABLE "payload"."product_variants_locales" (
  	"name" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  ALTER TABLE "payload"."product_variants_locales" ADD CONSTRAINT "product_variants_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "product_variants_locales_locale_parent_id_unique" ON "payload"."product_variants_locales" USING btree ("_locale","_parent_id");

  -- ── Backfill existing content into the default 'vi' locale before dropping the old
  --    base-table columns. Upsert so any pre-existing 'vi' locale row (from SEO meta)
  --    is updated rather than colliding with the (_locale,_parent_id) unique index. ──
  INSERT INTO "payload"."products_locales" ("title", "description", "_parent_id", "_locale")
    SELECT "title", "description", "id", 'vi' FROM "payload"."products"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE
    SET "title" = EXCLUDED."title", "description" = EXCLUDED."description";

  INSERT INTO "payload"."categories_locales" ("title", "subtitle", "_parent_id", "_locale")
    SELECT "title", "subtitle", "id", 'vi' FROM "payload"."categories"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE
    SET "title" = EXCLUDED."title", "subtitle" = EXCLUDED."subtitle";

  INSERT INTO "payload"."product_variants_locales" ("name", "_parent_id", "_locale")
    SELECT "name", "id", 'vi' FROM "payload"."product_variants"
  ON CONFLICT ("_locale", "_parent_id") DO UPDATE
    SET "name" = EXCLUDED."name";

  -- ── Enforce NOT NULL on the required localized columns now that they are backfilled. ──
  ALTER TABLE "payload"."products_locales" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "payload"."categories_locales" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "payload"."product_variants_locales" ALTER COLUMN "name" SET NOT NULL;

  -- ── Drop the old base-table columns; Payload now reads/writes these via the
  --    locales tables (with fallback to 'vi'). ──
  ALTER TABLE "payload"."products" DROP COLUMN "title";
  ALTER TABLE "payload"."products" DROP COLUMN "description";
  ALTER TABLE "payload"."categories" DROP COLUMN "title";
  ALTER TABLE "payload"."categories" DROP COLUMN "subtitle";
  ALTER TABLE "payload"."product_variants" DROP COLUMN "name";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  -- ── Restore base-table columns (nullable first for the backfill). ──
  ALTER TABLE "payload"."products" ADD COLUMN "title" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "description" varchar;
  ALTER TABLE "payload"."categories" ADD COLUMN "title" varchar;
  ALTER TABLE "payload"."categories" ADD COLUMN "subtitle" varchar;
  ALTER TABLE "payload"."product_variants" ADD COLUMN "name" varchar;

  -- ── Copy the 'vi' locale values back into the base tables. ──
  UPDATE "payload"."products" b
    SET "title" = l."title", "description" = l."description"
    FROM "payload"."products_locales" l
    WHERE l."_parent_id" = b."id" AND l."_locale" = 'vi';
  UPDATE "payload"."categories" b
    SET "title" = l."title", "subtitle" = l."subtitle"
    FROM "payload"."categories_locales" l
    WHERE l."_parent_id" = b."id" AND l."_locale" = 'vi';
  UPDATE "payload"."product_variants" b
    SET "name" = l."name"
    FROM "payload"."product_variants_locales" l
    WHERE l."_parent_id" = b."id" AND l."_locale" = 'vi';

  -- ── Re-enforce NOT NULL on the originally-required base columns. ──
  ALTER TABLE "payload"."products" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "payload"."categories" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "payload"."product_variants" ALTER COLUMN "name" SET NOT NULL;

  -- ── Drop the fresh product_variants_locales table entirely. ──
  ALTER TABLE "payload"."product_variants_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."product_variants_locales" CASCADE;

  -- ── Remove the localized columns added to the shared locales tables. ──
  ALTER TABLE "payload"."products_locales" DROP COLUMN "title";
  ALTER TABLE "payload"."products_locales" DROP COLUMN "description";
  ALTER TABLE "payload"."categories_locales" DROP COLUMN "title";
  ALTER TABLE "payload"."categories_locales" DROP COLUMN "subtitle";`)
}
