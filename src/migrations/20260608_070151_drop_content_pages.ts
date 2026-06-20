import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."content_pages_blocks_hero" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."content_pages_blocks_rich_text" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."content_pages_blocks_cta" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."content_pages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."content_pages_blocks_hero" CASCADE;
  DROP TABLE "payload"."content_pages_blocks_rich_text" CASCADE;
  DROP TABLE "payload"."content_pages_blocks_cta" CASCADE;
  DROP TABLE "payload"."content_pages" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_content_pages_fk";

  DROP INDEX IF EXISTS "payload"."payload_locked_documents_rels_content_pages_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN IF EXISTS "content_pages_id";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."content_pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"headline" varchar NOT NULL,
  	"subheadline" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."content_pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."content_pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar,
  	"button_label" varchar NOT NULL,
  	"button_href" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."content_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"published" boolean DEFAULT false,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "content_pages_id" integer;
  ALTER TABLE "payload"."content_pages_blocks_hero" ADD CONSTRAINT "content_pages_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."content_pages_blocks_hero" ADD CONSTRAINT "content_pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."content_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."content_pages_blocks_rich_text" ADD CONSTRAINT "content_pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."content_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."content_pages_blocks_cta" ADD CONSTRAINT "content_pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."content_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."content_pages" ADD CONSTRAINT "content_pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "content_pages_blocks_hero_order_idx" ON "payload"."content_pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "content_pages_blocks_hero_parent_id_idx" ON "payload"."content_pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "content_pages_blocks_hero_path_idx" ON "payload"."content_pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "content_pages_blocks_hero_image_idx" ON "payload"."content_pages_blocks_hero" USING btree ("image_id");
  CREATE INDEX "content_pages_blocks_rich_text_order_idx" ON "payload"."content_pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "content_pages_blocks_rich_text_parent_id_idx" ON "payload"."content_pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "content_pages_blocks_rich_text_path_idx" ON "payload"."content_pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "content_pages_blocks_cta_order_idx" ON "payload"."content_pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "content_pages_blocks_cta_parent_id_idx" ON "payload"."content_pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "content_pages_blocks_cta_path_idx" ON "payload"."content_pages_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "content_pages_slug_idx" ON "payload"."content_pages" USING btree ("slug");
  CREATE INDEX "content_pages_meta_meta_image_idx" ON "payload"."content_pages" USING btree ("meta_image_id");
  CREATE INDEX "content_pages_updated_at_idx" ON "payload"."content_pages" USING btree ("updated_at");
  CREATE INDEX "content_pages_created_at_idx" ON "payload"."content_pages" USING btree ("created_at");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_pages_fk" FOREIGN KEY ("content_pages_id") REFERENCES "payload"."content_pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_content_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("content_pages_id");`)
}
