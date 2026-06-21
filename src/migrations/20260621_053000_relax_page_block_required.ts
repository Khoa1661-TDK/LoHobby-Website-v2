import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Relax NOT NULL constraints on page-builder block columns that were previously
// `required: true`. The visual builder autosaves blocks before they are filled in,
// so these columns must accept nulls. Validation/required enforcement now lives in
// the storefront render layer (render-safe blocks) rather than the database.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "collection_id" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "content" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_gallery_images" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ALTER COLUMN "quote" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ALTER COLUMN "author" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ALTER COLUMN "image_id" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ALTER COLUMN "alt" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "headline" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq_items" ALTER COLUMN "question" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq_items" ALTER COLUMN "answer" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "text" DROP NOT NULL;
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "url" DROP NOT NULL;`)
}

// Re-applying NOT NULL will fail if any rows now hold nulls in these columns; that is
// the expected trade-off of reverting to required fields.
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "headline" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "collection_id" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "content" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "headline" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_gallery_images" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ALTER COLUMN "quote" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ALTER COLUMN "author" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ALTER COLUMN "image_id" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ALTER COLUMN "alt" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "headline" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq_items" ALTER COLUMN "question" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_faq_items" ALTER COLUMN "answer" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "text" SET NOT NULL;
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "url" SET NOT NULL;`)
}
