import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_feature_grid_variant" AS ENUM('list', 'cards');
  CREATE TYPE "payload"."enum_pages_blocks_product_showcase_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_product_showcase_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_product_showcase_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_product_showcase_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_product_showcase_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_product_showcase_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  CREATE TYPE "payload"."enum_pages_blocks_reels_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_reels_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_reels_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_reels_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_reels_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_reels_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  CREATE TABLE "payload"."pages_blocks_hero_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."pages_blocks_hero_collage" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"alt" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_product_showcase" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"subheading" varchar,
  	"show_tabs" boolean DEFAULT true,
  	"show_sort" boolean DEFAULT true,
  	"background" "payload"."enum_pages_blocks_product_showcase_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_product_showcase_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_product_showcase_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_product_showcase_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_product_showcase_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_product_showcase_scroll_animation" DEFAULT 'default',
  	"block_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_reels_tiles" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"poster_id" integer,
  	"tag" varchar,
  	"caption" varchar,
  	"views" varchar,
  	"embed_url" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_reels" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"follow_label" varchar,
  	"follow_href" varchar,
  	"background" "payload"."enum_pages_blocks_reels_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_reels_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_reels_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_reels_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_reels_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_reels_scroll_animation" DEFAULT 'default',
  	"block_key" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."store_settings" ALTER COLUMN "font_preset" SET DATA TYPE text;
  ALTER TABLE "payload"."store_settings" ALTER COLUMN "font_preset" SET DEFAULT 'inter'::text;
  DROP TYPE "payload"."enum_store_settings_font_preset";
  CREATE TYPE "payload"."enum_store_settings_font_preset" AS ENUM('inter', 'jakarta', 'roboto', 'system');
  ALTER TABLE "payload"."store_settings" ALTER COLUMN "font_preset" SET DEFAULT 'inter'::"payload"."enum_store_settings_font_preset";
  ALTER TABLE "payload"."store_settings" ALTER COLUMN "font_preset" SET DATA TYPE "payload"."enum_store_settings_font_preset" USING "font_preset"::"payload"."enum_store_settings_font_preset";
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "eyebrow" varchar;
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "secondary_cta_label" varchar;
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "secondary_cta_href" varchar;
  ALTER TABLE "payload"."pages_blocks_feature_grid_items" ADD COLUMN "image_id" integer;
  ALTER TABLE "payload"."pages_blocks_feature_grid_items" ADD COLUMN "caption" varchar;
  ALTER TABLE "payload"."pages_blocks_feature_grid_items" ADD COLUMN "href" varchar;
  ALTER TABLE "payload"."pages_blocks_feature_grid" ADD COLUMN "variant" "payload"."enum_pages_blocks_feature_grid_variant" DEFAULT 'list';
  ALTER TABLE "payload"."pages_blocks_hero_stats" ADD CONSTRAINT "pages_blocks_hero_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero_collage" ADD CONSTRAINT "pages_blocks_hero_collage_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero_collage" ADD CONSTRAINT "pages_blocks_hero_collage_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_product_showcase" ADD CONSTRAINT "pages_blocks_product_showcase_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_reels_tiles" ADD CONSTRAINT "pages_blocks_reels_tiles_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_reels_tiles" ADD CONSTRAINT "pages_blocks_reels_tiles_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_reels"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_reels" ADD CONSTRAINT "pages_blocks_reels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_hero_stats_order_idx" ON "payload"."pages_blocks_hero_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_stats_parent_id_idx" ON "payload"."pages_blocks_hero_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_stats_locale_idx" ON "payload"."pages_blocks_hero_stats" USING btree ("_locale");
  CREATE INDEX "pages_blocks_hero_collage_order_idx" ON "payload"."pages_blocks_hero_collage" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_collage_parent_id_idx" ON "payload"."pages_blocks_hero_collage" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_collage_locale_idx" ON "payload"."pages_blocks_hero_collage" USING btree ("_locale");
  CREATE INDEX "pages_blocks_hero_collage_image_idx" ON "payload"."pages_blocks_hero_collage" USING btree ("image_id");
  CREATE INDEX "pages_blocks_product_showcase_order_idx" ON "payload"."pages_blocks_product_showcase" USING btree ("_order");
  CREATE INDEX "pages_blocks_product_showcase_parent_id_idx" ON "payload"."pages_blocks_product_showcase" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_product_showcase_path_idx" ON "payload"."pages_blocks_product_showcase" USING btree ("_path");
  CREATE INDEX "pages_blocks_product_showcase_locale_idx" ON "payload"."pages_blocks_product_showcase" USING btree ("_locale");
  CREATE INDEX "pages_blocks_reels_tiles_order_idx" ON "payload"."pages_blocks_reels_tiles" USING btree ("_order");
  CREATE INDEX "pages_blocks_reels_tiles_parent_id_idx" ON "payload"."pages_blocks_reels_tiles" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_reels_tiles_locale_idx" ON "payload"."pages_blocks_reels_tiles" USING btree ("_locale");
  CREATE INDEX "pages_blocks_reels_tiles_poster_idx" ON "payload"."pages_blocks_reels_tiles" USING btree ("poster_id");
  CREATE INDEX "pages_blocks_reels_order_idx" ON "payload"."pages_blocks_reels" USING btree ("_order");
  CREATE INDEX "pages_blocks_reels_parent_id_idx" ON "payload"."pages_blocks_reels" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_reels_path_idx" ON "payload"."pages_blocks_reels" USING btree ("_path");
  CREATE INDEX "pages_blocks_reels_locale_idx" ON "payload"."pages_blocks_reels" USING btree ("_locale");
  ALTER TABLE "payload"."pages_blocks_feature_grid_items" ADD CONSTRAINT "pages_blocks_feature_grid_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_feature_grid_items_image_idx" ON "payload"."pages_blocks_feature_grid_items" USING btree ("image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_hero_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."pages_blocks_hero_collage" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."pages_blocks_product_showcase" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."pages_blocks_reels_tiles" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."pages_blocks_reels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."pages_blocks_hero_stats" CASCADE;
  DROP TABLE "payload"."pages_blocks_hero_collage" CASCADE;
  DROP TABLE "payload"."pages_blocks_product_showcase" CASCADE;
  DROP TABLE "payload"."pages_blocks_reels_tiles" CASCADE;
  DROP TABLE "payload"."pages_blocks_reels" CASCADE;
  ALTER TABLE "payload"."pages_blocks_feature_grid_items" DROP CONSTRAINT "pages_blocks_feature_grid_items_image_id_media_id_fk";
  
  ALTER TABLE "payload"."store_settings" ALTER COLUMN "font_preset" SET DATA TYPE text;
  ALTER TABLE "payload"."store_settings" ALTER COLUMN "font_preset" SET DEFAULT 'jakarta'::text;
  DROP TYPE "payload"."enum_store_settings_font_preset";
  CREATE TYPE "payload"."enum_store_settings_font_preset" AS ENUM('jakarta', 'inter', 'roboto', 'system');
  ALTER TABLE "payload"."store_settings" ALTER COLUMN "font_preset" SET DEFAULT 'jakarta'::"payload"."enum_store_settings_font_preset";
  ALTER TABLE "payload"."store_settings" ALTER COLUMN "font_preset" SET DATA TYPE "payload"."enum_store_settings_font_preset" USING "font_preset"::"payload"."enum_store_settings_font_preset";
  DROP INDEX "payload"."pages_blocks_feature_grid_items_image_idx";
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "eyebrow";
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "secondary_cta_label";
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "secondary_cta_href";
  ALTER TABLE "payload"."pages_blocks_feature_grid_items" DROP COLUMN "image_id";
  ALTER TABLE "payload"."pages_blocks_feature_grid_items" DROP COLUMN "caption";
  ALTER TABLE "payload"."pages_blocks_feature_grid_items" DROP COLUMN "href";
  ALTER TABLE "payload"."pages_blocks_feature_grid" DROP COLUMN "variant";
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_variant";
  DROP TYPE "payload"."enum_pages_blocks_product_showcase_background";
  DROP TYPE "payload"."enum_pages_blocks_product_showcase_container_width";
  DROP TYPE "payload"."enum_pages_blocks_product_showcase_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_product_showcase_content_align";
  DROP TYPE "payload"."enum_pages_blocks_product_showcase_rounded";
  DROP TYPE "payload"."enum_pages_blocks_product_showcase_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_reels_background";
  DROP TYPE "payload"."enum_pages_blocks_reels_container_width";
  DROP TYPE "payload"."enum_pages_blocks_reels_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_reels_content_align";
  DROP TYPE "payload"."enum_pages_blocks_reels_rounded";
  DROP TYPE "payload"."enum_pages_blocks_reels_scroll_animation";`)
}
