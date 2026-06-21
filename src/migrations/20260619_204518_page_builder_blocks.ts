import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_recommendations_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_recommendations_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_recommendations_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_recently_viewed_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_recently_viewed_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_recently_viewed_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TABLE "payload"."pages_blocks_recommendations" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Recommended for you',
  	"limit" numeric DEFAULT 8,
  	"background" "payload"."enum_pages_blocks_recommendations_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_recommendations_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_recommendations_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_recently_viewed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Recently viewed',
  	"limit" numeric DEFAULT 8,
  	"background" "payload"."enum_pages_blocks_recently_viewed_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_recently_viewed_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_recently_viewed_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."pages_blocks_recommendations" ADD CONSTRAINT "pages_blocks_recommendations_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ADD CONSTRAINT "pages_blocks_recently_viewed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_recommendations_order_idx" ON "payload"."pages_blocks_recommendations" USING btree ("_order");
  CREATE INDEX "pages_blocks_recommendations_parent_id_idx" ON "payload"."pages_blocks_recommendations" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_recommendations_path_idx" ON "payload"."pages_blocks_recommendations" USING btree ("_path");
  CREATE INDEX "pages_blocks_recently_viewed_order_idx" ON "payload"."pages_blocks_recently_viewed" USING btree ("_order");
  CREATE INDEX "pages_blocks_recently_viewed_parent_id_idx" ON "payload"."pages_blocks_recently_viewed" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_recently_viewed_path_idx" ON "payload"."pages_blocks_recently_viewed" USING btree ("_path");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_blocks_recommendations" CASCADE;
  DROP TABLE "payload"."pages_blocks_recently_viewed" CASCADE;
  DROP TYPE "payload"."enum_pages_blocks_recommendations_background";
  DROP TYPE "payload"."enum_pages_blocks_recommendations_container_width";
  DROP TYPE "payload"."enum_pages_blocks_recommendations_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_recently_viewed_background";
  DROP TYPE "payload"."enum_pages_blocks_recently_viewed_container_width";
  DROP TYPE "payload"."enum_pages_blocks_recently_viewed_padding_y";`)
}
