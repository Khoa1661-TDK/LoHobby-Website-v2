import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_spacer_height" AS ENUM('xs', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_spacer_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_spacer_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_spacer_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_columns_column_count" AS ENUM('2', '3', '4');
  CREATE TYPE "payload"."enum_pages_blocks_columns_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_columns_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_columns_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_align" AS ENUM('left', 'center');
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_stats_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_stats_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_stats_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_quote_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_quote_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_quote_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_column_count" AS ENUM('2', '3', '4');
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_banner_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_banner_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_banner_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_steps_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_steps_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_steps_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TABLE "payload"."pages_blocks_spacer" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"height" "payload"."enum_pages_blocks_spacer_height" DEFAULT 'md',
  	"background" "payload"."enum_pages_blocks_spacer_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_spacer_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_spacer_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_columns_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"body" varchar,
  	"image_id" integer,
  	"url" varchar,
  	"open_in_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."pages_blocks_columns" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"column_count" "payload"."enum_pages_blocks_columns_column_count" DEFAULT '3',
  	"background" "payload"."enum_pages_blocks_columns_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_columns_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_columns_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_call_to_action" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"primary_label" varchar,
  	"primary_url" varchar,
  	"primary_open_in_new_tab" boolean DEFAULT false,
  	"secondary_label" varchar,
  	"secondary_url" varchar,
  	"secondary_open_in_new_tab" boolean DEFAULT false,
  	"align" "payload"."enum_pages_blocks_call_to_action_align" DEFAULT 'center',
  	"background" "payload"."enum_pages_blocks_call_to_action_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_call_to_action_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_call_to_action_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_stats_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"background" "payload"."enum_pages_blocks_stats_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_stats_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_stats_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_quote" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar NOT NULL,
  	"author" varchar,
  	"role" varchar,
  	"avatar_id" integer,
  	"background" "payload"."enum_pages_blocks_quote_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_quote_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_quote_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_card_grid_cards" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"title" varchar,
  	"body" varchar,
  	"url" varchar,
  	"open_in_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."pages_blocks_card_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"column_count" "payload"."enum_pages_blocks_card_grid_column_count" DEFAULT '3',
  	"background" "payload"."enum_pages_blocks_card_grid_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_card_grid_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_card_grid_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"link_label" varchar,
  	"url" varchar,
  	"open_in_new_tab" boolean DEFAULT false,
  	"background" "payload"."enum_pages_blocks_banner_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_banner_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_banner_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_steps_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"background" "payload"."enum_pages_blocks_steps_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_steps_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_steps_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "url" varchar;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "open_in_new_tab" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "url" varchar;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "open_in_new_tab" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_spacer" ADD CONSTRAINT "pages_blocks_spacer_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_columns_columns" ADD CONSTRAINT "pages_blocks_columns_columns_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_columns_columns" ADD CONSTRAINT "pages_blocks_columns_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_columns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_columns" ADD CONSTRAINT "pages_blocks_columns_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_call_to_action" ADD CONSTRAINT "pages_blocks_call_to_action_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_stats_items" ADD CONSTRAINT "pages_blocks_stats_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_stats" ADD CONSTRAINT "pages_blocks_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_quote" ADD CONSTRAINT "pages_blocks_quote_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_quote" ADD CONSTRAINT "pages_blocks_quote_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_card_grid_cards" ADD CONSTRAINT "pages_blocks_card_grid_cards_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_card_grid_cards" ADD CONSTRAINT "pages_blocks_card_grid_cards_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_card_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_card_grid" ADD CONSTRAINT "pages_blocks_card_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_banner" ADD CONSTRAINT "pages_blocks_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_steps_steps" ADD CONSTRAINT "pages_blocks_steps_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_steps" ADD CONSTRAINT "pages_blocks_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_spacer_order_idx" ON "payload"."pages_blocks_spacer" USING btree ("_order");
  CREATE INDEX "pages_blocks_spacer_parent_id_idx" ON "payload"."pages_blocks_spacer" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_spacer_path_idx" ON "payload"."pages_blocks_spacer" USING btree ("_path");
  CREATE INDEX "pages_blocks_spacer_locale_idx" ON "payload"."pages_blocks_spacer" USING btree ("_locale");
  CREATE INDEX "pages_blocks_columns_columns_order_idx" ON "payload"."pages_blocks_columns_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_columns_columns_parent_id_idx" ON "payload"."pages_blocks_columns_columns" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_columns_columns_locale_idx" ON "payload"."pages_blocks_columns_columns" USING btree ("_locale");
  CREATE INDEX "pages_blocks_columns_columns_image_idx" ON "payload"."pages_blocks_columns_columns" USING btree ("image_id");
  CREATE INDEX "pages_blocks_columns_order_idx" ON "payload"."pages_blocks_columns" USING btree ("_order");
  CREATE INDEX "pages_blocks_columns_parent_id_idx" ON "payload"."pages_blocks_columns" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_columns_path_idx" ON "payload"."pages_blocks_columns" USING btree ("_path");
  CREATE INDEX "pages_blocks_columns_locale_idx" ON "payload"."pages_blocks_columns" USING btree ("_locale");
  CREATE INDEX "pages_blocks_call_to_action_order_idx" ON "payload"."pages_blocks_call_to_action" USING btree ("_order");
  CREATE INDEX "pages_blocks_call_to_action_parent_id_idx" ON "payload"."pages_blocks_call_to_action" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_call_to_action_path_idx" ON "payload"."pages_blocks_call_to_action" USING btree ("_path");
  CREATE INDEX "pages_blocks_call_to_action_locale_idx" ON "payload"."pages_blocks_call_to_action" USING btree ("_locale");
  CREATE INDEX "pages_blocks_stats_items_order_idx" ON "payload"."pages_blocks_stats_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_items_parent_id_idx" ON "payload"."pages_blocks_stats_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_items_locale_idx" ON "payload"."pages_blocks_stats_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_stats_order_idx" ON "payload"."pages_blocks_stats" USING btree ("_order");
  CREATE INDEX "pages_blocks_stats_parent_id_idx" ON "payload"."pages_blocks_stats" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_stats_path_idx" ON "payload"."pages_blocks_stats" USING btree ("_path");
  CREATE INDEX "pages_blocks_stats_locale_idx" ON "payload"."pages_blocks_stats" USING btree ("_locale");
  CREATE INDEX "pages_blocks_quote_order_idx" ON "payload"."pages_blocks_quote" USING btree ("_order");
  CREATE INDEX "pages_blocks_quote_parent_id_idx" ON "payload"."pages_blocks_quote" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_quote_path_idx" ON "payload"."pages_blocks_quote" USING btree ("_path");
  CREATE INDEX "pages_blocks_quote_locale_idx" ON "payload"."pages_blocks_quote" USING btree ("_locale");
  CREATE INDEX "pages_blocks_quote_avatar_idx" ON "payload"."pages_blocks_quote" USING btree ("avatar_id");
  CREATE INDEX "pages_blocks_card_grid_cards_order_idx" ON "payload"."pages_blocks_card_grid_cards" USING btree ("_order");
  CREATE INDEX "pages_blocks_card_grid_cards_parent_id_idx" ON "payload"."pages_blocks_card_grid_cards" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_card_grid_cards_locale_idx" ON "payload"."pages_blocks_card_grid_cards" USING btree ("_locale");
  CREATE INDEX "pages_blocks_card_grid_cards_image_idx" ON "payload"."pages_blocks_card_grid_cards" USING btree ("image_id");
  CREATE INDEX "pages_blocks_card_grid_order_idx" ON "payload"."pages_blocks_card_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_card_grid_parent_id_idx" ON "payload"."pages_blocks_card_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_card_grid_path_idx" ON "payload"."pages_blocks_card_grid" USING btree ("_path");
  CREATE INDEX "pages_blocks_card_grid_locale_idx" ON "payload"."pages_blocks_card_grid" USING btree ("_locale");
  CREATE INDEX "pages_blocks_banner_order_idx" ON "payload"."pages_blocks_banner" USING btree ("_order");
  CREATE INDEX "pages_blocks_banner_parent_id_idx" ON "payload"."pages_blocks_banner" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_banner_path_idx" ON "payload"."pages_blocks_banner" USING btree ("_path");
  CREATE INDEX "pages_blocks_banner_locale_idx" ON "payload"."pages_blocks_banner" USING btree ("_locale");
  CREATE INDEX "pages_blocks_steps_steps_order_idx" ON "payload"."pages_blocks_steps_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_steps_steps_parent_id_idx" ON "payload"."pages_blocks_steps_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_steps_steps_locale_idx" ON "payload"."pages_blocks_steps_steps" USING btree ("_locale");
  CREATE INDEX "pages_blocks_steps_order_idx" ON "payload"."pages_blocks_steps" USING btree ("_order");
  CREATE INDEX "pages_blocks_steps_parent_id_idx" ON "payload"."pages_blocks_steps" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_steps_path_idx" ON "payload"."pages_blocks_steps" USING btree ("_path");
  CREATE INDEX "pages_blocks_steps_locale_idx" ON "payload"."pages_blocks_steps" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_blocks_spacer" CASCADE;
  DROP TABLE "payload"."pages_blocks_columns_columns" CASCADE;
  DROP TABLE "payload"."pages_blocks_columns" CASCADE;
  DROP TABLE "payload"."pages_blocks_call_to_action" CASCADE;
  DROP TABLE "payload"."pages_blocks_stats_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_stats" CASCADE;
  DROP TABLE "payload"."pages_blocks_quote" CASCADE;
  DROP TABLE "payload"."pages_blocks_card_grid_cards" CASCADE;
  DROP TABLE "payload"."pages_blocks_card_grid" CASCADE;
  DROP TABLE "payload"."pages_blocks_banner" CASCADE;
  DROP TABLE "payload"."pages_blocks_steps_steps" CASCADE;
  DROP TABLE "payload"."pages_blocks_steps" CASCADE;
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "url";
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "open_in_new_tab";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "url";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "open_in_new_tab";
  DROP TYPE "payload"."enum_pages_blocks_spacer_height";
  DROP TYPE "payload"."enum_pages_blocks_spacer_background";
  DROP TYPE "payload"."enum_pages_blocks_spacer_container_width";
  DROP TYPE "payload"."enum_pages_blocks_spacer_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_columns_column_count";
  DROP TYPE "payload"."enum_pages_blocks_columns_background";
  DROP TYPE "payload"."enum_pages_blocks_columns_container_width";
  DROP TYPE "payload"."enum_pages_blocks_columns_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_align";
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_background";
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_container_width";
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_stats_background";
  DROP TYPE "payload"."enum_pages_blocks_stats_container_width";
  DROP TYPE "payload"."enum_pages_blocks_stats_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_quote_background";
  DROP TYPE "payload"."enum_pages_blocks_quote_container_width";
  DROP TYPE "payload"."enum_pages_blocks_quote_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_card_grid_column_count";
  DROP TYPE "payload"."enum_pages_blocks_card_grid_background";
  DROP TYPE "payload"."enum_pages_blocks_card_grid_container_width";
  DROP TYPE "payload"."enum_pages_blocks_card_grid_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_banner_background";
  DROP TYPE "payload"."enum_pages_blocks_banner_container_width";
  DROP TYPE "payload"."enum_pages_blocks_banner_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_steps_background";
  DROP TYPE "payload"."enum_pages_blocks_steps_container_width";
  DROP TYPE "payload"."enum_pages_blocks_steps_padding_y";`)
}
