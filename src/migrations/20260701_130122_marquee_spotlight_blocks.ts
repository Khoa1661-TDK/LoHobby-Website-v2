import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_marquee_speed" AS ENUM('slow', 'normal', 'fast');
  CREATE TYPE "payload"."enum_pages_blocks_marquee_direction" AS ENUM('left', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_marquee_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_marquee_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_marquee_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_marquee_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_marquee_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_marquee_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  CREATE TYPE "payload"."enum_pages_blocks_spotlight_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_spotlight_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_spotlight_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_spotlight_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_spotlight_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_spotlight_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  CREATE TABLE "payload"."pages_blocks_marquee_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."pages_blocks_marquee" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"speed" "payload"."enum_pages_blocks_marquee_speed" DEFAULT 'normal',
  	"direction" "payload"."enum_pages_blocks_marquee_direction" DEFAULT 'left',
  	"background" "payload"."enum_pages_blocks_marquee_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_marquee_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_marquee_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_marquee_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_marquee_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_marquee_scroll_animation" DEFAULT 'default',
  	"block_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_spotlight" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"description" varchar,
  	"discount_label" varchar,
  	"price_now" varchar,
  	"price_was" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"target_date" varchar,
  	"expired_text" varchar DEFAULT 'This deal has ended.',
  	"background" "payload"."enum_pages_blocks_spotlight_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_spotlight_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_spotlight_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_spotlight_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_spotlight_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_spotlight_scroll_animation" DEFAULT 'default',
  	"block_key" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."pages_blocks_marquee_items" ADD CONSTRAINT "pages_blocks_marquee_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_marquee"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_marquee" ADD CONSTRAINT "pages_blocks_marquee_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD CONSTRAINT "pages_blocks_spotlight_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_spotlight" ADD CONSTRAINT "pages_blocks_spotlight_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_marquee_items_order_idx" ON "payload"."pages_blocks_marquee_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_marquee_items_parent_id_idx" ON "payload"."pages_blocks_marquee_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_marquee_items_locale_idx" ON "payload"."pages_blocks_marquee_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_marquee_order_idx" ON "payload"."pages_blocks_marquee" USING btree ("_order");
  CREATE INDEX "pages_blocks_marquee_parent_id_idx" ON "payload"."pages_blocks_marquee" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_marquee_path_idx" ON "payload"."pages_blocks_marquee" USING btree ("_path");
  CREATE INDEX "pages_blocks_marquee_locale_idx" ON "payload"."pages_blocks_marquee" USING btree ("_locale");
  CREATE INDEX "pages_blocks_spotlight_order_idx" ON "payload"."pages_blocks_spotlight" USING btree ("_order");
  CREATE INDEX "pages_blocks_spotlight_parent_id_idx" ON "payload"."pages_blocks_spotlight" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_spotlight_path_idx" ON "payload"."pages_blocks_spotlight" USING btree ("_path");
  CREATE INDEX "pages_blocks_spotlight_locale_idx" ON "payload"."pages_blocks_spotlight" USING btree ("_locale");
  CREATE INDEX "pages_blocks_spotlight_product_idx" ON "payload"."pages_blocks_spotlight" USING btree ("product_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_blocks_marquee_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_marquee" CASCADE;
  DROP TABLE "payload"."pages_blocks_spotlight" CASCADE;
  DROP TYPE "payload"."enum_pages_blocks_marquee_speed";
  DROP TYPE "payload"."enum_pages_blocks_marquee_direction";
  DROP TYPE "payload"."enum_pages_blocks_marquee_background";
  DROP TYPE "payload"."enum_pages_blocks_marquee_container_width";
  DROP TYPE "payload"."enum_pages_blocks_marquee_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_marquee_content_align";
  DROP TYPE "payload"."enum_pages_blocks_marquee_rounded";
  DROP TYPE "payload"."enum_pages_blocks_marquee_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_spotlight_background";
  DROP TYPE "payload"."enum_pages_blocks_spotlight_container_width";
  DROP TYPE "payload"."enum_pages_blocks_spotlight_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_spotlight_content_align";
  DROP TYPE "payload"."enum_pages_blocks_spotlight_rounded";
  DROP TYPE "payload"."enum_pages_blocks_spotlight_scroll_animation";`)
}
