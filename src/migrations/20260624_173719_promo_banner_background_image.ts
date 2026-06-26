import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "background_image_id" integer;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD CONSTRAINT "pages_blocks_promo_banner_background_image_id_media_id_fk" FOREIGN KEY ("background_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "pages_blocks_promo_banner_background_image_idx" ON "payload"."pages_blocks_promo_banner" USING btree ("background_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_promo_banner" DROP CONSTRAINT "pages_blocks_promo_banner_background_image_id_media_id_fk";
  
  DROP INDEX "payload"."pages_blocks_promo_banner_background_image_idx";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "background_image_id";`)
}
