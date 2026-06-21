import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."_locales" AS ENUM('vi', 'en');
  CREATE TYPE "payload"."enum_exports_locale" AS ENUM('all', 'vi', 'en');
  CREATE TABLE "payload"."categories_locales" (
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."products_locales" (
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."blog_categories_locales" (
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."posts_locales" (
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "payload"."pages_locales" (
  	"title" varchar NOT NULL,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload"."categories" DROP CONSTRAINT "categories_meta_image_id_media_id_fk";
  
  ALTER TABLE "payload"."products" DROP CONSTRAINT "products_meta_image_id_media_id_fk";
  
  ALTER TABLE "payload"."blog_categories" DROP CONSTRAINT "blog_categories_meta_image_id_media_id_fk";
  
  ALTER TABLE "payload"."posts" DROP CONSTRAINT "posts_meta_image_id_media_id_fk";
  
  ALTER TABLE "payload"."pages" DROP CONSTRAINT "pages_meta_image_id_media_id_fk";
  
  DROP INDEX "payload"."categories_meta_meta_image_idx";
  DROP INDEX "payload"."products_meta_meta_image_idx";
  DROP INDEX "payload"."blog_categories_meta_meta_image_idx";
  DROP INDEX "payload"."posts_meta_meta_image_idx";
  DROP INDEX "payload"."pages_meta_meta_image_idx";
  DROP INDEX "payload"."pages_rels_products_id_idx";
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "collection_id" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "content" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_gallery_images" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ALTER COLUMN "quote" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ALTER COLUMN "author" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ALTER COLUMN "alt" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq_items" ALTER COLUMN "question" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq_items" ALTER COLUMN "answer" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "url" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_featured_products" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_rich_text" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_gallery_images" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_gallery" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_testimonials" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_newsletter" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_faq_items" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_faq" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_divider" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_recommendations" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ADD COLUMN "_locale" "payload"."_locales";
  ALTER TABLE "payload"."pages_rels" ADD COLUMN "locale" "payload"."_locales";
  ALTER TABLE "payload"."exports" ADD COLUMN "locale" "payload"."enum_exports_locale" DEFAULT 'all';
  ALTER TABLE "payload"."categories_locales" ADD CONSTRAINT "categories_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."categories_locales" ADD CONSTRAINT "categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_locales" ADD CONSTRAINT "products_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_locales" ADD CONSTRAINT "products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."blog_categories_locales" ADD CONSTRAINT "blog_categories_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."blog_categories_locales" ADD CONSTRAINT "blog_categories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."blog_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."posts_locales" ADD CONSTRAINT "posts_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."posts_locales" ADD CONSTRAINT "posts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_locales" ADD CONSTRAINT "pages_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_locales" ADD CONSTRAINT "pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "categories_meta_meta_image_idx" ON "payload"."categories_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "categories_locales_locale_parent_id_unique" ON "payload"."categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "products_meta_meta_image_idx" ON "payload"."products_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "products_locales_locale_parent_id_unique" ON "payload"."products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "blog_categories_meta_meta_image_idx" ON "payload"."blog_categories_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "blog_categories_locales_locale_parent_id_unique" ON "payload"."blog_categories_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "posts_meta_meta_image_idx" ON "payload"."posts_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "posts_locales_locale_parent_id_unique" ON "payload"."posts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_meta_meta_image_idx" ON "payload"."pages_locales" USING btree ("meta_image_id","_locale");
  CREATE UNIQUE INDEX "pages_locales_locale_parent_id_unique" ON "payload"."pages_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "pages_blocks_hero_locale_idx" ON "payload"."pages_blocks_hero" USING btree ("_locale");
  CREATE INDEX "pages_blocks_featured_collection_locale_idx" ON "payload"."pages_blocks_featured_collection" USING btree ("_locale");
  CREATE INDEX "pages_blocks_featured_products_locale_idx" ON "payload"."pages_blocks_featured_products" USING btree ("_locale");
  CREATE INDEX "pages_blocks_rich_text_locale_idx" ON "payload"."pages_blocks_rich_text" USING btree ("_locale");
  CREATE INDEX "pages_blocks_image_with_text_locale_idx" ON "payload"."pages_blocks_image_with_text" USING btree ("_locale");
  CREATE INDEX "pages_blocks_gallery_images_locale_idx" ON "payload"."pages_blocks_gallery_images" USING btree ("_locale");
  CREATE INDEX "pages_blocks_gallery_locale_idx" ON "payload"."pages_blocks_gallery" USING btree ("_locale");
  CREATE INDEX "pages_blocks_testimonials_entries_locale_idx" ON "payload"."pages_blocks_testimonials_entries" USING btree ("_locale");
  CREATE INDEX "pages_blocks_testimonials_locale_idx" ON "payload"."pages_blocks_testimonials" USING btree ("_locale");
  CREATE INDEX "pages_blocks_logo_cloud_logos_locale_idx" ON "payload"."pages_blocks_logo_cloud_logos" USING btree ("_locale");
  CREATE INDEX "pages_blocks_logo_cloud_locale_idx" ON "payload"."pages_blocks_logo_cloud" USING btree ("_locale");
  CREATE INDEX "pages_blocks_newsletter_locale_idx" ON "payload"."pages_blocks_newsletter" USING btree ("_locale");
  CREATE INDEX "pages_blocks_faq_items_locale_idx" ON "payload"."pages_blocks_faq_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_faq_locale_idx" ON "payload"."pages_blocks_faq" USING btree ("_locale");
  CREATE INDEX "pages_blocks_promo_banner_locale_idx" ON "payload"."pages_blocks_promo_banner" USING btree ("_locale");
  CREATE INDEX "pages_blocks_video_embed_locale_idx" ON "payload"."pages_blocks_video_embed" USING btree ("_locale");
  CREATE INDEX "pages_blocks_divider_locale_idx" ON "payload"."pages_blocks_divider" USING btree ("_locale");
  CREATE INDEX "pages_blocks_recommendations_locale_idx" ON "payload"."pages_blocks_recommendations" USING btree ("_locale");
  CREATE INDEX "pages_blocks_recently_viewed_locale_idx" ON "payload"."pages_blocks_recently_viewed" USING btree ("_locale");
  CREATE INDEX "pages_rels_locale_idx" ON "payload"."pages_rels" USING btree ("locale");
  CREATE INDEX "pages_rels_products_id_idx" ON "payload"."pages_rels" USING btree ("products_id","locale");

  -- Backfill existing content into the default 'vi' locale before dropping old columns.
  INSERT INTO "payload"."pages_locales" ("title", "_parent_id", "_locale")
    SELECT "title", "id", 'vi' FROM "payload"."pages";
  UPDATE "payload"."pages_blocks_hero" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_featured_collection" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_featured_products" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_rich_text" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_image_with_text" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_gallery_images" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_gallery" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_testimonials_entries" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_testimonials" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_logo_cloud_logos" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_logo_cloud" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_newsletter" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_faq_items" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_faq" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_promo_banner" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_video_embed" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_divider" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_recommendations" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_blocks_recently_viewed" SET "_locale" = 'vi' WHERE "_locale" IS NULL;
  UPDATE "payload"."pages_rels" SET "locale" = 'vi' WHERE "locale" IS NULL;

  -- Now that every existing block row has a locale, enforce NOT NULL to match the schema.
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_gallery_images" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq_items" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "_locale" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "_locale" SET NOT NULL;

  ALTER TABLE "payload"."categories" DROP COLUMN "meta_title";
  ALTER TABLE "payload"."categories" DROP COLUMN "meta_description";
  ALTER TABLE "payload"."categories" DROP COLUMN "meta_image_id";
  ALTER TABLE "payload"."products" DROP COLUMN "meta_title";
  ALTER TABLE "payload"."products" DROP COLUMN "meta_description";
  ALTER TABLE "payload"."products" DROP COLUMN "meta_image_id";
  ALTER TABLE "payload"."blog_categories" DROP COLUMN "meta_title";
  ALTER TABLE "payload"."blog_categories" DROP COLUMN "meta_description";
  ALTER TABLE "payload"."blog_categories" DROP COLUMN "meta_image_id";
  ALTER TABLE "payload"."posts" DROP COLUMN "meta_title";
  ALTER TABLE "payload"."posts" DROP COLUMN "meta_description";
  ALTER TABLE "payload"."posts" DROP COLUMN "meta_image_id";
  ALTER TABLE "payload"."pages" DROP COLUMN "title";
  ALTER TABLE "payload"."pages" DROP COLUMN "meta_title";
  ALTER TABLE "payload"."pages" DROP COLUMN "meta_description";
  ALTER TABLE "payload"."pages" DROP COLUMN "meta_image_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."products_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."blog_categories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."posts_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."pages_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."categories_locales" CASCADE;
  DROP TABLE "payload"."products_locales" CASCADE;
  DROP TABLE "payload"."blog_categories_locales" CASCADE;
  DROP TABLE "payload"."posts_locales" CASCADE;
  DROP TABLE "payload"."pages_locales" CASCADE;
  DROP INDEX "payload"."pages_blocks_hero_locale_idx";
  DROP INDEX "payload"."pages_blocks_featured_collection_locale_idx";
  DROP INDEX "payload"."pages_blocks_featured_products_locale_idx";
  DROP INDEX "payload"."pages_blocks_rich_text_locale_idx";
  DROP INDEX "payload"."pages_blocks_image_with_text_locale_idx";
  DROP INDEX "payload"."pages_blocks_gallery_images_locale_idx";
  DROP INDEX "payload"."pages_blocks_gallery_locale_idx";
  DROP INDEX "payload"."pages_blocks_testimonials_entries_locale_idx";
  DROP INDEX "payload"."pages_blocks_testimonials_locale_idx";
  DROP INDEX "payload"."pages_blocks_logo_cloud_logos_locale_idx";
  DROP INDEX "payload"."pages_blocks_logo_cloud_locale_idx";
  DROP INDEX "payload"."pages_blocks_newsletter_locale_idx";
  DROP INDEX "payload"."pages_blocks_faq_items_locale_idx";
  DROP INDEX "payload"."pages_blocks_faq_locale_idx";
  DROP INDEX "payload"."pages_blocks_promo_banner_locale_idx";
  DROP INDEX "payload"."pages_blocks_video_embed_locale_idx";
  DROP INDEX "payload"."pages_blocks_divider_locale_idx";
  DROP INDEX "payload"."pages_blocks_recommendations_locale_idx";
  DROP INDEX "payload"."pages_blocks_recently_viewed_locale_idx";
  DROP INDEX "payload"."pages_rels_locale_idx";
  DROP INDEX "payload"."pages_rels_products_id_idx";
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "headline" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "collection_id" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "content" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "headline" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_gallery_images" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ALTER COLUMN "quote" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ALTER COLUMN "author" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ALTER COLUMN "alt" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "headline" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq_items" ALTER COLUMN "question" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq_items" ALTER COLUMN "answer" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "url" SET NOT NULL;
  ALTER TABLE "payload"."categories" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "payload"."categories" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "payload"."categories" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "payload"."products" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "payload"."products" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "payload"."blog_categories" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "payload"."blog_categories" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "payload"."blog_categories" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "payload"."posts" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "payload"."posts" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "payload"."posts" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "payload"."pages" ADD COLUMN "title" varchar NOT NULL;
  ALTER TABLE "payload"."pages" ADD COLUMN "meta_title" varchar;
  ALTER TABLE "payload"."pages" ADD COLUMN "meta_description" varchar;
  ALTER TABLE "payload"."pages" ADD COLUMN "meta_image_id" integer;
  ALTER TABLE "payload"."categories" ADD CONSTRAINT "categories_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."blog_categories" ADD CONSTRAINT "blog_categories_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."posts" ADD CONSTRAINT "posts_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "categories_meta_meta_image_idx" ON "payload"."categories" USING btree ("meta_image_id");
  CREATE INDEX "products_meta_meta_image_idx" ON "payload"."products" USING btree ("meta_image_id");
  CREATE INDEX "blog_categories_meta_meta_image_idx" ON "payload"."blog_categories" USING btree ("meta_image_id");
  CREATE INDEX "posts_meta_meta_image_idx" ON "payload"."posts" USING btree ("meta_image_id");
  CREATE INDEX "pages_meta_meta_image_idx" ON "payload"."pages" USING btree ("meta_image_id");
  CREATE INDEX "pages_rels_products_id_idx" ON "payload"."pages_rels" USING btree ("products_id");
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_featured_collection" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_featured_products" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_rich_text" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_gallery_images" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_gallery" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_testimonials" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_newsletter" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_faq_items" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_faq" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_video_embed" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_divider" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_recommendations" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" DROP COLUMN "_locale";
  ALTER TABLE "payload"."pages_rels" DROP COLUMN "locale";
  ALTER TABLE "payload"."exports" DROP COLUMN "locale";
  DROP TYPE "payload"."_locales";
  DROP TYPE "payload"."enum_exports_locale";`)
}
