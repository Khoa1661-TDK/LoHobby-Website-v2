import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_button_style" AS ENUM('primary', 'outline', 'minimal');
  CREATE TYPE "payload"."enum_pages_blocks_button_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_button_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_button_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_button_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_text_text_align" AS ENUM('left', 'center');
  CREATE TYPE "payload"."enum_pages_blocks_text_size" AS ENUM('small', 'normal', 'large');
  CREATE TYPE "payload"."enum_pages_blocks_text_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_text_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_text_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_items_platform" AS ENUM('facebook', 'instagram', 'x', 'youtube', 'tiktok', 'discord', 'linkedin', 'threads', 'pinterest', 'telegram', 'whatsapp', 'github', 'email');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_icon_style" AS ENUM('solid', 'outline');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TABLE "payload"."pages_blocks_button" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar,
  	"open_in_new_tab" boolean DEFAULT false,
  	"style" "payload"."enum_pages_blocks_button_style" DEFAULT 'primary',
  	"align" "payload"."enum_pages_blocks_button_align" DEFAULT 'left',
  	"background" "payload"."enum_pages_blocks_button_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_button_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_button_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar,
  	"text_align" "payload"."enum_pages_blocks_text_text_align" DEFAULT 'left',
  	"size" "payload"."enum_pages_blocks_text_size" DEFAULT 'normal',
  	"url" varchar,
  	"open_in_new_tab" boolean DEFAULT false,
  	"background" "payload"."enum_pages_blocks_text_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_text_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_text_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_social_bar_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "payload"."enum_pages_blocks_social_bar_items_platform" DEFAULT 'facebook' NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."pages_blocks_social_bar" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"align" "payload"."enum_pages_blocks_social_bar_align" DEFAULT 'left',
  	"icon_style" "payload"."enum_pages_blocks_social_bar_icon_style" DEFAULT 'solid',
  	"size" "payload"."enum_pages_blocks_social_bar_size" DEFAULT 'medium',
  	"background" "payload"."enum_pages_blocks_social_bar_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_social_bar_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_social_bar_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."pages_blocks_gallery_images" ADD COLUMN "href" varchar;
  ALTER TABLE "payload"."pages_blocks_button" ADD CONSTRAINT "pages_blocks_button_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_text" ADD CONSTRAINT "pages_blocks_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_social_bar_items" ADD CONSTRAINT "pages_blocks_social_bar_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_social_bar"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_social_bar" ADD CONSTRAINT "pages_blocks_social_bar_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_button_order_idx" ON "payload"."pages_blocks_button" USING btree ("_order");
  CREATE INDEX "pages_blocks_button_parent_id_idx" ON "payload"."pages_blocks_button" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_button_path_idx" ON "payload"."pages_blocks_button" USING btree ("_path");
  CREATE INDEX "pages_blocks_button_locale_idx" ON "payload"."pages_blocks_button" USING btree ("_locale");
  CREATE INDEX "pages_blocks_text_order_idx" ON "payload"."pages_blocks_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_text_parent_id_idx" ON "payload"."pages_blocks_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_text_path_idx" ON "payload"."pages_blocks_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_text_locale_idx" ON "payload"."pages_blocks_text" USING btree ("_locale");
  CREATE INDEX "pages_blocks_social_bar_items_order_idx" ON "payload"."pages_blocks_social_bar_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_social_bar_items_parent_id_idx" ON "payload"."pages_blocks_social_bar_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_social_bar_items_locale_idx" ON "payload"."pages_blocks_social_bar_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_social_bar_order_idx" ON "payload"."pages_blocks_social_bar" USING btree ("_order");
  CREATE INDEX "pages_blocks_social_bar_parent_id_idx" ON "payload"."pages_blocks_social_bar" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_social_bar_path_idx" ON "payload"."pages_blocks_social_bar" USING btree ("_path");
  CREATE INDEX "pages_blocks_social_bar_locale_idx" ON "payload"."pages_blocks_social_bar" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_blocks_button" CASCADE;
  DROP TABLE "payload"."pages_blocks_text" CASCADE;
  DROP TABLE "payload"."pages_blocks_social_bar_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_social_bar" CASCADE;
  ALTER TABLE "payload"."pages_blocks_gallery_images" DROP COLUMN "href";
  DROP TYPE "payload"."enum_pages_blocks_button_style";
  DROP TYPE "payload"."enum_pages_blocks_button_align";
  DROP TYPE "payload"."enum_pages_blocks_button_background";
  DROP TYPE "payload"."enum_pages_blocks_button_container_width";
  DROP TYPE "payload"."enum_pages_blocks_button_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_text_text_align";
  DROP TYPE "payload"."enum_pages_blocks_text_size";
  DROP TYPE "payload"."enum_pages_blocks_text_background";
  DROP TYPE "payload"."enum_pages_blocks_text_container_width";
  DROP TYPE "payload"."enum_pages_blocks_text_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_items_platform";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_align";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_icon_style";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_size";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_background";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_container_width";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_padding_y";`)
}
