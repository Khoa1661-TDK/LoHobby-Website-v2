import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_info_section_social_platform" AS ENUM('facebook', 'instagram', 'x', 'youtube', 'tiktok', 'discord', 'linkedin', 'threads', 'pinterest', 'telegram', 'whatsapp', 'github', 'email');
  CREATE TYPE "payload"."enum_pages_blocks_info_section_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_info_section_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_info_section_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_info_section_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_info_section_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_info_section_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  CREATE TABLE "payload"."pages_blocks_info_section_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."pages_blocks_info_section_social" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "payload"."enum_pages_blocks_info_section_social_platform" DEFAULT 'facebook' NOT NULL,
  	"url" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_info_section" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"about" varchar,
  	"contact_heading" varchar DEFAULT 'Contact',
  	"contact_address" varchar,
  	"contact_phone" varchar,
  	"contact_email" varchar,
  	"links_heading" varchar DEFAULT 'Quick Links',
  	"background" "payload"."enum_pages_blocks_info_section_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_info_section_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_info_section_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_info_section_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_info_section_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_info_section_scroll_animation" DEFAULT 'default',
  	"block_key" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."pages_blocks_info_section_links" ADD CONSTRAINT "pages_blocks_info_section_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_info_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_info_section_social" ADD CONSTRAINT "pages_blocks_info_section_social_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_info_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_info_section" ADD CONSTRAINT "pages_blocks_info_section_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_info_section_links_order_idx" ON "payload"."pages_blocks_info_section_links" USING btree ("_order");
  CREATE INDEX "pages_blocks_info_section_links_parent_id_idx" ON "payload"."pages_blocks_info_section_links" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_info_section_links_locale_idx" ON "payload"."pages_blocks_info_section_links" USING btree ("_locale");
  CREATE INDEX "pages_blocks_info_section_social_order_idx" ON "payload"."pages_blocks_info_section_social" USING btree ("_order");
  CREATE INDEX "pages_blocks_info_section_social_parent_id_idx" ON "payload"."pages_blocks_info_section_social" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_info_section_social_locale_idx" ON "payload"."pages_blocks_info_section_social" USING btree ("_locale");
  CREATE INDEX "pages_blocks_info_section_order_idx" ON "payload"."pages_blocks_info_section" USING btree ("_order");
  CREATE INDEX "pages_blocks_info_section_parent_id_idx" ON "payload"."pages_blocks_info_section" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_info_section_path_idx" ON "payload"."pages_blocks_info_section" USING btree ("_path");
  CREATE INDEX "pages_blocks_info_section_locale_idx" ON "payload"."pages_blocks_info_section" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_blocks_info_section_links" CASCADE;
  DROP TABLE "payload"."pages_blocks_info_section_social" CASCADE;
  DROP TABLE "payload"."pages_blocks_info_section" CASCADE;
  DROP TYPE "payload"."enum_pages_blocks_info_section_social_platform";
  DROP TYPE "payload"."enum_pages_blocks_info_section_background";
  DROP TYPE "payload"."enum_pages_blocks_info_section_container_width";
  DROP TYPE "payload"."enum_pages_blocks_info_section_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_info_section_content_align";
  DROP TYPE "payload"."enum_pages_blocks_info_section_rounded";
  DROP TYPE "payload"."enum_pages_blocks_info_section_scroll_animation";`)
}
