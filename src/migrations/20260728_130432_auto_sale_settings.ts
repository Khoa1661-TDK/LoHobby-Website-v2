import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the `auto-sale-settings` global (enabled toggle, excludedProducts
// hasMany relationship, lastRun summary group).
//
// HAND-TRIMMED from Payload's generated migration. `payload migrate:create`
// bundled these additive statements with two unrelated ones caused by
// pre-existing schema drift on the dev database: a full CREATE TABLE for an
// unrelated `pages_blocks_custom_html` block (its enum types, indexes, and FK),
// and a redundant `ALTER TABLE "payload"."products" ADD COLUMN "auto_sale_managed"`
// that migration 20260726_120000_auto_sale_managed already applied. Only the
// auto_sale_settings / auto_sale_settings_rels statements below were kept; they
// are copied verbatim from that generated output. See the header of
// 20260725_183829_block_icon_fields.ts for the same pattern.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."auto_sale_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT true,
  	"last_run_ran_at" varchar,
  	"last_run_enabled_count" numeric,
  	"last_run_disabled_count" numeric,
  	"last_run_skipped_count" numeric,
  	"last_run_error_count" numeric,
  	"last_run_enabled_products" varchar,
  	"last_run_disabled_products" varchar,
  	"last_run_error" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );

  CREATE TABLE "payload"."auto_sale_settings_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );

  ALTER TABLE "payload"."auto_sale_settings_rels" ADD CONSTRAINT "auto_sale_settings_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."auto_sale_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."auto_sale_settings_rels" ADD CONSTRAINT "auto_sale_settings_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "auto_sale_settings_rels_order_idx" ON "payload"."auto_sale_settings_rels" USING btree ("order");
  CREATE INDEX "auto_sale_settings_rels_parent_idx" ON "payload"."auto_sale_settings_rels" USING btree ("parent_id");
  CREATE INDEX "auto_sale_settings_rels_path_idx" ON "payload"."auto_sale_settings_rels" USING btree ("path");
  CREATE INDEX "auto_sale_settings_rels_products_id_idx" ON "payload"."auto_sale_settings_rels" USING btree ("products_id");
`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."auto_sale_settings" CASCADE;
  DROP TABLE "payload"."auto_sale_settings_rels" CASCADE;
`)
}
