import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Creates the CustomHtml page-builder block table (src/payload/blocks/CustomHtml.ts).
// Written by hand: `payload migrate:create` generated the table in its JSON snapshot
// but dropped the CREATE statements from the .ts, and re-added columns that
// 20260729_090000 / 20260729_170000 already applied. All statements are idempotent.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
    CREATE TYPE "payload"."enum_pages_blocks_custom_html_background" AS ENUM('theme', 'light', 'dark', 'custom');
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   DO $$ BEGIN
    CREATE TYPE "payload"."enum_pages_blocks_custom_html_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   DO $$ BEGIN
    CREATE TYPE "payload"."enum_pages_blocks_custom_html_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   DO $$ BEGIN
    CREATE TYPE "payload"."enum_pages_blocks_custom_html_content_align" AS ENUM('left', 'center', 'right');
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   DO $$ BEGIN
    CREATE TYPE "payload"."enum_pages_blocks_custom_html_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   DO $$ BEGIN
    CREATE TYPE "payload"."enum_pages_blocks_custom_html_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   CREATE TABLE IF NOT EXISTS "payload"."pages_blocks_custom_html" (
    "id" varchar NOT NULL,
    "_order" integer NOT NULL,
    "_path" text NOT NULL,
    "_parent_id" integer NOT NULL,
    "_locale" "payload"._locales NOT NULL,
    "label" varchar,
    "html" varchar NOT NULL,
    "css" varchar,
    "background" "payload"."enum_pages_blocks_custom_html_background" DEFAULT 'theme',
    "background_custom" varchar,
    "background_custom_dark" varchar,
    "container_width" "payload"."enum_pages_blocks_custom_html_container_width" DEFAULT 'normal',
    "padding_y" "payload"."enum_pages_blocks_custom_html_padding_y" DEFAULT 'base',
    "max_width_custom" varchar,
    "content_align" "payload"."enum_pages_blocks_custom_html_content_align" DEFAULT 'left',
    "rounded" "payload"."enum_pages_blocks_custom_html_rounded" DEFAULT 'none',
    "border" boolean DEFAULT false,
    "scroll_animation" "payload"."enum_pages_blocks_custom_html_scroll_animation" DEFAULT 'default',
    "block_key" varchar,
    "block_name" varchar,
    CONSTRAINT "pages_blocks_custom_html_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pages_blocks_custom_html_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE CASCADE
   );

   CREATE INDEX IF NOT EXISTS "pages_blocks_custom_html_order_idx" ON "payload"."pages_blocks_custom_html" USING btree ("_order" ASC NULLS LAST);
   CREATE INDEX IF NOT EXISTS "pages_blocks_custom_html_parent_id_idx" ON "payload"."pages_blocks_custom_html" USING btree ("_parent_id" ASC NULLS LAST);
   CREATE INDEX IF NOT EXISTS "pages_blocks_custom_html_path_idx" ON "payload"."pages_blocks_custom_html" USING btree ("_path" ASC NULLS LAST);
   CREATE INDEX IF NOT EXISTS "pages_blocks_custom_html_locale_idx" ON "payload"."pages_blocks_custom_html" USING btree ("_locale" ASC NULLS LAST);
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE IF EXISTS "payload"."pages_blocks_custom_html";
   DROP TYPE IF EXISTS "payload"."enum_pages_blocks_custom_html_background";
   DROP TYPE IF EXISTS "payload"."enum_pages_blocks_custom_html_container_width";
   DROP TYPE IF EXISTS "payload"."enum_pages_blocks_custom_html_padding_y";
   DROP TYPE IF EXISTS "payload"."enum_pages_blocks_custom_html_content_align";
   DROP TYPE IF EXISTS "payload"."enum_pages_blocks_custom_html_rounded";
   DROP TYPE IF EXISTS "payload"."enum_pages_blocks_custom_html_scroll_animation";
  `)
}
