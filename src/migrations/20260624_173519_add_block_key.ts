import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_social_bar_items" ALTER COLUMN "url" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_featured_products" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_rich_text" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_gallery" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_testimonials" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_newsletter" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_faq" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_divider" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_recommendations" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_button" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_text" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_social_bar" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_spacer" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_columns" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_call_to_action" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_stats" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_quote" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_card_grid" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_banner" ADD COLUMN "block_key" varchar;
  ALTER TABLE "payload"."pages_blocks_steps" ADD COLUMN "block_key" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_social_bar_items" ALTER COLUMN "url" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_featured_collection" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_featured_products" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_rich_text" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_gallery" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_testimonials" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_newsletter" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_faq" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_video_embed" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_divider" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_recommendations" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_button" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_text" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_social_bar" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_spacer" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_columns" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_call_to_action" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_stats" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_quote" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_card_grid" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_banner" DROP COLUMN "block_key";
  ALTER TABLE "payload"."pages_blocks_steps" DROP COLUMN "block_key";`)
}
