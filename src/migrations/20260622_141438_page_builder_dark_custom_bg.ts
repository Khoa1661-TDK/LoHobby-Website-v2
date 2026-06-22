import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_featured_products" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_rich_text" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_gallery" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_testimonials" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_newsletter" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_faq" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_divider" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_recommendations" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_button" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_text" ADD COLUMN "background_custom_dark" varchar;
  ALTER TABLE "payload"."pages_blocks_social_bar" ADD COLUMN "background_custom_dark" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_featured_collection" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_featured_products" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_rich_text" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_gallery" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_testimonials" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_newsletter" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_faq" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_video_embed" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_divider" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_recommendations" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_button" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_text" DROP COLUMN "background_custom_dark";
  ALTER TABLE "payload"."pages_blocks_social_bar" DROP COLUMN "background_custom_dark";`)
}
