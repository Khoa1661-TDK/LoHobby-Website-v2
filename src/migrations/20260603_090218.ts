import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_posts_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_redirects_type" AS ENUM('301', '302');
  CREATE TABLE "payload"."blog_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"description" varchar,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."posts_tags" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tag" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"excerpt" varchar,
  	"cover_image_id" integer,
  	"body" jsonb,
  	"author_id" integer,
  	"category_id" integer,
  	"published_at" timestamp(3) with time zone,
  	"status" "payload"."enum_posts_status" DEFAULT 'draft' NOT NULL,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."redirects" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"from" varchar NOT NULL,
  	"to" varchar NOT NULL,
  	"type" "payload"."enum_redirects_type" DEFAULT '301' NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."navigation_footer_menu_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."navigation_footer_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."navigation_mobile_menu_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL,
  	"open_in_new_tab" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."navigation_mobile_menu" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."navigation" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "blog_categories_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "posts_id" integer;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "redirects_id" integer;
  ALTER TABLE "payload"."blog_categories" ADD CONSTRAINT "blog_categories_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."posts_tags" ADD CONSTRAINT "posts_tags_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."posts" ADD CONSTRAINT "posts_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."posts" ADD CONSTRAINT "posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "payload"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."posts" ADD CONSTRAINT "posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "payload"."blog_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."posts" ADD CONSTRAINT "posts_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."navigation_footer_menu_links" ADD CONSTRAINT "navigation_footer_menu_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation_footer_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_footer_menu" ADD CONSTRAINT "navigation_footer_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_mobile_menu_links" ADD CONSTRAINT "navigation_mobile_menu_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation_mobile_menu"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."navigation_mobile_menu" ADD CONSTRAINT "navigation_mobile_menu_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."navigation"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "blog_categories_slug_idx" ON "payload"."blog_categories" USING btree ("slug");
  CREATE INDEX "blog_categories_meta_meta_image_idx" ON "payload"."blog_categories" USING btree ("meta_image_id");
  CREATE INDEX "blog_categories_updated_at_idx" ON "payload"."blog_categories" USING btree ("updated_at");
  CREATE INDEX "blog_categories_created_at_idx" ON "payload"."blog_categories" USING btree ("created_at");
  CREATE INDEX "posts_tags_order_idx" ON "payload"."posts_tags" USING btree ("_order");
  CREATE INDEX "posts_tags_parent_id_idx" ON "payload"."posts_tags" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "posts_slug_idx" ON "payload"."posts" USING btree ("slug");
  CREATE INDEX "posts_cover_image_idx" ON "payload"."posts" USING btree ("cover_image_id");
  CREATE INDEX "posts_author_idx" ON "payload"."posts" USING btree ("author_id");
  CREATE INDEX "posts_category_idx" ON "payload"."posts" USING btree ("category_id");
  CREATE INDEX "posts_meta_meta_image_idx" ON "payload"."posts" USING btree ("meta_image_id");
  CREATE INDEX "posts_updated_at_idx" ON "payload"."posts" USING btree ("updated_at");
  CREATE INDEX "posts_created_at_idx" ON "payload"."posts" USING btree ("created_at");
  CREATE UNIQUE INDEX "redirects_from_idx" ON "payload"."redirects" USING btree ("from");
  CREATE INDEX "redirects_updated_at_idx" ON "payload"."redirects" USING btree ("updated_at");
  CREATE INDEX "redirects_created_at_idx" ON "payload"."redirects" USING btree ("created_at");
  CREATE INDEX "navigation_footer_menu_links_order_idx" ON "payload"."navigation_footer_menu_links" USING btree ("_order");
  CREATE INDEX "navigation_footer_menu_links_parent_id_idx" ON "payload"."navigation_footer_menu_links" USING btree ("_parent_id");
  CREATE INDEX "navigation_footer_menu_order_idx" ON "payload"."navigation_footer_menu" USING btree ("_order");
  CREATE INDEX "navigation_footer_menu_parent_id_idx" ON "payload"."navigation_footer_menu" USING btree ("_parent_id");
  CREATE INDEX "navigation_mobile_menu_links_order_idx" ON "payload"."navigation_mobile_menu_links" USING btree ("_order");
  CREATE INDEX "navigation_mobile_menu_links_parent_id_idx" ON "payload"."navigation_mobile_menu_links" USING btree ("_parent_id");
  CREATE INDEX "navigation_mobile_menu_order_idx" ON "payload"."navigation_mobile_menu" USING btree ("_order");
  CREATE INDEX "navigation_mobile_menu_parent_id_idx" ON "payload"."navigation_mobile_menu" USING btree ("_parent_id");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blog_categories_fk" FOREIGN KEY ("blog_categories_id") REFERENCES "payload"."blog_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "payload"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_redirects_fk" FOREIGN KEY ("redirects_id") REFERENCES "payload"."redirects"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_blog_categories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("blog_categories_id");
  CREATE INDEX "payload_locked_documents_rels_posts_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("posts_id");
  CREATE INDEX "payload_locked_documents_rels_redirects_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("redirects_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."blog_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."posts_tags" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."redirects" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."navigation_footer_menu_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."navigation_footer_menu" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."navigation_mobile_menu_links" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."navigation_mobile_menu" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payload"."navigation" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."blog_categories" CASCADE;
  DROP TABLE "payload"."posts_tags" CASCADE;
  DROP TABLE "payload"."posts" CASCADE;
  DROP TABLE "payload"."redirects" CASCADE;
  DROP TABLE "payload"."navigation_footer_menu_links" CASCADE;
  DROP TABLE "payload"."navigation_footer_menu" CASCADE;
  DROP TABLE "payload"."navigation_mobile_menu_links" CASCADE;
  DROP TABLE "payload"."navigation_mobile_menu" CASCADE;
  DROP TABLE "payload"."navigation" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blog_categories_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_posts_fk";
  
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_redirects_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_blog_categories_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_posts_id_idx";
  DROP INDEX "payload"."payload_locked_documents_rels_redirects_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "blog_categories_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "posts_id";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "redirects_id";
  DROP TYPE "payload"."enum_posts_status";
  DROP TYPE "payload"."enum_redirects_type";`)
}
