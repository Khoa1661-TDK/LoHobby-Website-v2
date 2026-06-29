import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Remap dropped presets before the enum swap. The old enum had
  // ('none','reveal-up','reveal-right','scale-in'); the new enum drops
  // 'reveal-up'/'reveal-right'. Any existing row holding those would fail the
  // final `USING ::enum` cast, so remap them while the columns are still the
  // old type. Targets mirror the runtime alias map in lib/animations/config.ts
  // (reveal-up→fade-up, reveal-right→slide-right) so stored data and code agree
  // — both targets exist in the new enum, so the remap is semantic, not lossy.
  await db.execute(sql`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN SELECT table_name FROM information_schema.columns
               WHERE table_schema = 'payload' AND column_name = 'scroll_animation'
      LOOP
        EXECUTE format(
          'UPDATE payload.%I SET scroll_animation = ''fade-up'' WHERE scroll_animation::text = ''reveal-up''',
          r.table_name);
        EXECUTE format(
          'UPDATE payload.%I SET scroll_animation = ''slide-right'' WHERE scroll_animation::text = ''reveal-right''',
          r.table_name);
      END LOOP;
    END $$;
  `)
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_hero_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_hero_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_hero_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_hero_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_hero_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_featured_collection_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_featured_collection_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_featured_collection_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_featured_products_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_featured_products_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_featured_products_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_featured_products_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_rich_text_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_rich_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_rich_text_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_rich_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_image_with_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_image_with_text_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_image_with_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_gallery_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_gallery_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_gallery_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_gallery_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_gallery_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_testimonials_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_testimonials_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_testimonials_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_testimonials_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_logo_cloud_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_logo_cloud_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_logo_cloud_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_logo_cloud_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_logo_cloud_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_newsletter_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_newsletter_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_newsletter_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_newsletter_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_newsletter_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_faq_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_faq_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_faq_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_faq_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_faq_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_promo_banner_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_promo_banner_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_promo_banner_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_promo_banner_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_promo_banner_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_video_embed_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_video_embed_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_video_embed_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_video_embed_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_divider_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_divider_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_divider_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_divider_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_divider_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_recommendations_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_recommendations_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_recommendations_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_recommendations_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_recommendations_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_recently_viewed_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_recently_viewed_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_recently_viewed_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_recently_viewed_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_recently_viewed_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_button_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_button_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_button_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_button_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_button_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_text_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_text_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_text_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_social_bar_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_social_bar_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_social_bar_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_social_bar_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_spacer_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_spacer_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_spacer_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_spacer_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_spacer_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_columns_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_columns_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_columns_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_columns_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_columns_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_call_to_action_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_call_to_action_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_call_to_action_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_stats_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_stats_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_stats_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_stats_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_stats_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_quote_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_quote_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_quote_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_quote_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_quote_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_card_grid_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_card_grid_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_card_grid_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_card_grid_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_banner_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_banner_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_banner_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_banner_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_banner_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_steps_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_steps_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_steps_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_steps_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_steps_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_pricing_table" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_pricing_table" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_pricing_table_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_pricing_table_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_pricing_table" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_pricing_table_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_pricing_table" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_pricing_table_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_pricing_table_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_countdown" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_countdown" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_countdown_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_countdown_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_countdown" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_countdown_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_countdown" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_countdown_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_countdown_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_tabs" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_tabs" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_tabs_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_tabs_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_tabs" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_tabs_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_tabs" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_tabs_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_tabs_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_feature_grid" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_feature_grid" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::text;
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  ALTER TABLE "payload"."pages_blocks_feature_grid" ALTER COLUMN "scroll_animation" SET DEFAULT 'default'::"payload"."enum_pages_blocks_feature_grid_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_feature_grid" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_feature_grid_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_feature_grid_scroll_animation";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Mirror of up(): the old enum only has ('none','reveal-up','reveal-right',
  // 'scale-in'). Remap any value the old enum lacks back to 'none' (its default)
  // before reverting the type, so the `USING ::enum` cast cannot fail.
  await db.execute(sql`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN SELECT table_name FROM information_schema.columns
               WHERE table_schema = 'payload' AND column_name = 'scroll_animation'
      LOOP
        EXECUTE format(
          'UPDATE payload.%I SET scroll_animation = ''none'' WHERE scroll_animation::text NOT IN (''none'', ''scale-in'')',
          r.table_name);
      END LOOP;
    END $$;
  `)
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_hero_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_hero_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_hero_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_hero_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_hero_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_featured_collection_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_featured_collection_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_featured_collection_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_featured_products_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_featured_products_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_featured_products_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_featured_products_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_rich_text_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_rich_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_rich_text_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_rich_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_image_with_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_image_with_text_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_image_with_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_gallery_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_gallery_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_gallery_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_gallery_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_gallery_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_testimonials_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_testimonials_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_testimonials_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_testimonials_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_logo_cloud_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_logo_cloud_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_logo_cloud_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_logo_cloud_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_logo_cloud_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_newsletter_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_newsletter_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_newsletter_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_newsletter_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_newsletter_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_faq_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_faq_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_faq_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_faq_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_faq_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_promo_banner_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_promo_banner_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_promo_banner_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_promo_banner_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_promo_banner_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_video_embed_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_video_embed_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_video_embed_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_video_embed_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_divider_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_divider_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_divider_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_divider_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_divider_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_recommendations_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_recommendations_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_recommendations_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_recommendations_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_recommendations_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_recently_viewed_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_recently_viewed_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_recently_viewed_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_recently_viewed_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_recently_viewed_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_button_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_button_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_button_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_button_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_button_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_text_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_text_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_text_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_text_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_social_bar_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_social_bar_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_social_bar_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_social_bar_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_spacer_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_spacer_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_spacer_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_spacer_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_spacer_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_columns_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_columns_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_columns_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_columns_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_columns_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_call_to_action_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_call_to_action_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_call_to_action_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_stats_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_stats_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_stats_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_stats_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_stats_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_quote_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_quote_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_quote_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_quote_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_quote_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_card_grid_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_card_grid_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_card_grid_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_card_grid_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_banner_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_banner_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_banner_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_banner_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_banner_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_steps_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_steps_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_steps_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_steps_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_steps_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_pricing_table" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_pricing_table" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_pricing_table_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_pricing_table_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_pricing_table" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_pricing_table_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_pricing_table" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_pricing_table_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_pricing_table_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_countdown" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_countdown" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_countdown_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_countdown_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_countdown" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_countdown_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_countdown" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_countdown_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_countdown_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_tabs" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_tabs" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_tabs_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_tabs_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_tabs" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_tabs_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_tabs" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_tabs_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_tabs_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_feature_grid" ALTER COLUMN "scroll_animation" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_feature_grid" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::text;
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_scroll_animation";
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TABLE "payload"."pages_blocks_feature_grid" ALTER COLUMN "scroll_animation" SET DEFAULT 'none'::"payload"."enum_pages_blocks_feature_grid_scroll_animation";
  ALTER TABLE "payload"."pages_blocks_feature_grid" ALTER COLUMN "scroll_animation" SET DATA TYPE "payload"."enum_pages_blocks_feature_grid_scroll_animation" USING "scroll_animation"::"payload"."enum_pages_blocks_feature_grid_scroll_animation";`)
}
