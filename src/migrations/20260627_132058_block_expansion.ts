import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_hero_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_hero_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_hero_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_gallery_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_gallery_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_gallery_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_logo_cloud_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_logo_cloud_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_logo_cloud_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_newsletter_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_newsletter_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_newsletter_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_faq_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_faq_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_faq_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_promo_banner_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_promo_banner_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_promo_banner_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_divider_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_divider_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_divider_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_recommendations_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_recommendations_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_recommendations_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_recently_viewed_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_recently_viewed_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_recently_viewed_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_button_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_button_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_button_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_text_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_text_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_text_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_spacer_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_spacer_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_spacer_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_columns_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_columns_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_columns_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_stats_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_stats_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_stats_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_quote_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_quote_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_quote_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_banner_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_banner_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_banner_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_steps_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_steps_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_steps_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_pricing_table_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_pricing_table_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_pricing_table_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_pricing_table_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_pricing_table_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_pricing_table_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_countdown_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_countdown_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_countdown_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_countdown_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_countdown_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_countdown_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_tabs_variant" AS ENUM('tabs', 'accordion');
  CREATE TYPE "payload"."enum_pages_blocks_tabs_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_tabs_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_tabs_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_tabs_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_tabs_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_tabs_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_items_icon" AS ENUM('zap', 'truck', 'shield', 'star', 'box', 'layers', 'printer', 'sparkles', 'heart', 'clock', 'award', 'package', 'wrench', 'ruler', 'palette', 'thumbsUp');
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_columns" AS ENUM('2', '3', '4');
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_feature_grid_scroll_animation" AS ENUM('none', 'reveal-up', 'reveal-right', 'scale-in');
  ALTER TYPE "payload"."enum_pages_blocks_hero_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_featured_collection_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_featured_products_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_rich_text_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_image_with_text_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_gallery_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_testimonials_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_logo_cloud_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_newsletter_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_faq_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_promo_banner_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_video_embed_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_divider_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_recommendations_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_recently_viewed_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_button_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_text_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_social_bar_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_spacer_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_columns_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_call_to_action_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_stats_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_quote_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_card_grid_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_banner_container_width" ADD VALUE 'custom';
  ALTER TYPE "payload"."enum_pages_blocks_steps_container_width" ADD VALUE 'custom';
  CREATE TABLE "payload"."pages_blocks_pricing_table_tiers_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."pages_blocks_pricing_table_tiers" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"price" varchar NOT NULL,
  	"period" varchar,
  	"description" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"highlighted" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."pages_blocks_pricing_table" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"background" "payload"."enum_pages_blocks_pricing_table_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_pricing_table_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_pricing_table_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_pricing_table_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_pricing_table_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_pricing_table_scroll_animation" DEFAULT 'none',
  	"block_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_countdown" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"target_date" varchar NOT NULL,
  	"expired_text" varchar DEFAULT 'This offer has ended.',
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"background" "payload"."enum_pages_blocks_countdown_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_countdown_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_countdown_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_countdown_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_countdown_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_countdown_scroll_animation" DEFAULT 'none',
  	"block_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_tabs_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"content" jsonb
  );
  
  CREATE TABLE "payload"."pages_blocks_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"variant" "payload"."enum_pages_blocks_tabs_variant" DEFAULT 'tabs',
  	"heading" varchar,
  	"background" "payload"."enum_pages_blocks_tabs_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_tabs_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_tabs_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_tabs_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_tabs_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_tabs_scroll_animation" DEFAULT 'none',
  	"block_key" varchar,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_feature_grid_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"icon" "payload"."enum_pages_blocks_feature_grid_items_icon",
  	"title" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_feature_grid" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar,
  	"subheading" varchar,
  	"columns" "payload"."enum_pages_blocks_feature_grid_columns" DEFAULT '3',
  	"background" "payload"."enum_pages_blocks_feature_grid_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_feature_grid_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_feature_grid_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_feature_grid_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_feature_grid_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_feature_grid_scroll_animation" DEFAULT 'none',
  	"block_key" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "content_align" "payload"."enum_pages_blocks_hero_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "rounded" "payload"."enum_pages_blocks_hero_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_hero_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD COLUMN "content_align" "payload"."enum_pages_blocks_featured_collection_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD COLUMN "rounded" "payload"."enum_pages_blocks_featured_collection_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_featured_collection_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_featured_products" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_featured_products" ADD COLUMN "content_align" "payload"."enum_pages_blocks_featured_products_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_featured_products" ADD COLUMN "rounded" "payload"."enum_pages_blocks_featured_products_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_featured_products" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_featured_products" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_featured_products_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_rich_text" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_rich_text" ADD COLUMN "content_align" "payload"."enum_pages_blocks_rich_text_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_rich_text" ADD COLUMN "rounded" "payload"."enum_pages_blocks_rich_text_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_rich_text" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_rich_text" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_rich_text_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "content_align" "payload"."enum_pages_blocks_image_with_text_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "rounded" "payload"."enum_pages_blocks_image_with_text_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_image_with_text_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_gallery" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_gallery" ADD COLUMN "content_align" "payload"."enum_pages_blocks_gallery_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_gallery" ADD COLUMN "rounded" "payload"."enum_pages_blocks_gallery_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_gallery" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_gallery" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_gallery_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_testimonials" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_testimonials" ADD COLUMN "content_align" "payload"."enum_pages_blocks_testimonials_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_testimonials" ADD COLUMN "rounded" "payload"."enum_pages_blocks_testimonials_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_testimonials" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_testimonials" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_testimonials_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ADD COLUMN "content_align" "payload"."enum_pages_blocks_logo_cloud_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ADD COLUMN "rounded" "payload"."enum_pages_blocks_logo_cloud_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_logo_cloud_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_newsletter" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_newsletter" ADD COLUMN "content_align" "payload"."enum_pages_blocks_newsletter_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_newsletter" ADD COLUMN "rounded" "payload"."enum_pages_blocks_newsletter_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_newsletter" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_newsletter" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_newsletter_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_faq" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_faq" ADD COLUMN "content_align" "payload"."enum_pages_blocks_faq_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_faq" ADD COLUMN "rounded" "payload"."enum_pages_blocks_faq_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_faq" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_faq" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_faq_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "content_align" "payload"."enum_pages_blocks_promo_banner_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "rounded" "payload"."enum_pages_blocks_promo_banner_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_promo_banner_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD COLUMN "content_align" "payload"."enum_pages_blocks_video_embed_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD COLUMN "rounded" "payload"."enum_pages_blocks_video_embed_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_video_embed_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_divider" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_divider" ADD COLUMN "content_align" "payload"."enum_pages_blocks_divider_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_divider" ADD COLUMN "rounded" "payload"."enum_pages_blocks_divider_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_divider" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_divider" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_divider_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_recommendations" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_recommendations" ADD COLUMN "content_align" "payload"."enum_pages_blocks_recommendations_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_recommendations" ADD COLUMN "rounded" "payload"."enum_pages_blocks_recommendations_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_recommendations" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_recommendations" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_recommendations_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ADD COLUMN "content_align" "payload"."enum_pages_blocks_recently_viewed_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ADD COLUMN "rounded" "payload"."enum_pages_blocks_recently_viewed_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_recently_viewed_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_button" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_button" ADD COLUMN "content_align" "payload"."enum_pages_blocks_button_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_button" ADD COLUMN "rounded" "payload"."enum_pages_blocks_button_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_button" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_button" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_button_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_text" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_text" ADD COLUMN "content_align" "payload"."enum_pages_blocks_text_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_text" ADD COLUMN "rounded" "payload"."enum_pages_blocks_text_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_text" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_text" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_text_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_social_bar" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_social_bar" ADD COLUMN "content_align" "payload"."enum_pages_blocks_social_bar_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_social_bar" ADD COLUMN "rounded" "payload"."enum_pages_blocks_social_bar_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_social_bar" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_social_bar" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_social_bar_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_spacer" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_spacer" ADD COLUMN "content_align" "payload"."enum_pages_blocks_spacer_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_spacer" ADD COLUMN "rounded" "payload"."enum_pages_blocks_spacer_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_spacer" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_spacer" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_spacer_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_columns" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_columns" ADD COLUMN "content_align" "payload"."enum_pages_blocks_columns_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_columns" ADD COLUMN "rounded" "payload"."enum_pages_blocks_columns_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_columns" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_columns" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_columns_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_call_to_action" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_call_to_action" ADD COLUMN "content_align" "payload"."enum_pages_blocks_call_to_action_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_call_to_action" ADD COLUMN "rounded" "payload"."enum_pages_blocks_call_to_action_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_call_to_action" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_call_to_action" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_call_to_action_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_stats" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_stats" ADD COLUMN "content_align" "payload"."enum_pages_blocks_stats_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_stats" ADD COLUMN "rounded" "payload"."enum_pages_blocks_stats_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_stats" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_stats" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_stats_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_quote" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_quote" ADD COLUMN "content_align" "payload"."enum_pages_blocks_quote_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_quote" ADD COLUMN "rounded" "payload"."enum_pages_blocks_quote_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_quote" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_quote" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_quote_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_card_grid" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_card_grid" ADD COLUMN "content_align" "payload"."enum_pages_blocks_card_grid_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_card_grid" ADD COLUMN "rounded" "payload"."enum_pages_blocks_card_grid_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_card_grid" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_card_grid" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_card_grid_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_banner" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_banner" ADD COLUMN "content_align" "payload"."enum_pages_blocks_banner_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_banner" ADD COLUMN "rounded" "payload"."enum_pages_blocks_banner_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_banner" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_banner" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_banner_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_steps" ADD COLUMN "max_width_custom" varchar;
  ALTER TABLE "payload"."pages_blocks_steps" ADD COLUMN "content_align" "payload"."enum_pages_blocks_steps_content_align" DEFAULT 'left';
  ALTER TABLE "payload"."pages_blocks_steps" ADD COLUMN "rounded" "payload"."enum_pages_blocks_steps_rounded" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_steps" ADD COLUMN "border" boolean DEFAULT false;
  ALTER TABLE "payload"."pages_blocks_steps" ADD COLUMN "scroll_animation" "payload"."enum_pages_blocks_steps_scroll_animation" DEFAULT 'none';
  ALTER TABLE "payload"."pages_blocks_pricing_table_tiers_features" ADD CONSTRAINT "pages_blocks_pricing_table_tiers_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_pricing_table_tiers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_pricing_table_tiers" ADD CONSTRAINT "pages_blocks_pricing_table_tiers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_pricing_table"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_pricing_table" ADD CONSTRAINT "pages_blocks_pricing_table_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_countdown" ADD CONSTRAINT "pages_blocks_countdown_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_tabs_items" ADD CONSTRAINT "pages_blocks_tabs_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_tabs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_tabs" ADD CONSTRAINT "pages_blocks_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_feature_grid_items" ADD CONSTRAINT "pages_blocks_feature_grid_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_feature_grid"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_feature_grid" ADD CONSTRAINT "pages_blocks_feature_grid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_pricing_table_tiers_features_order_idx" ON "payload"."pages_blocks_pricing_table_tiers_features" USING btree ("_order");
  CREATE INDEX "pages_blocks_pricing_table_tiers_features_parent_id_idx" ON "payload"."pages_blocks_pricing_table_tiers_features" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_pricing_table_tiers_features_locale_idx" ON "payload"."pages_blocks_pricing_table_tiers_features" USING btree ("_locale");
  CREATE INDEX "pages_blocks_pricing_table_tiers_order_idx" ON "payload"."pages_blocks_pricing_table_tiers" USING btree ("_order");
  CREATE INDEX "pages_blocks_pricing_table_tiers_parent_id_idx" ON "payload"."pages_blocks_pricing_table_tiers" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_pricing_table_tiers_locale_idx" ON "payload"."pages_blocks_pricing_table_tiers" USING btree ("_locale");
  CREATE INDEX "pages_blocks_pricing_table_order_idx" ON "payload"."pages_blocks_pricing_table" USING btree ("_order");
  CREATE INDEX "pages_blocks_pricing_table_parent_id_idx" ON "payload"."pages_blocks_pricing_table" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_pricing_table_path_idx" ON "payload"."pages_blocks_pricing_table" USING btree ("_path");
  CREATE INDEX "pages_blocks_pricing_table_locale_idx" ON "payload"."pages_blocks_pricing_table" USING btree ("_locale");
  CREATE INDEX "pages_blocks_countdown_order_idx" ON "payload"."pages_blocks_countdown" USING btree ("_order");
  CREATE INDEX "pages_blocks_countdown_parent_id_idx" ON "payload"."pages_blocks_countdown" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_countdown_path_idx" ON "payload"."pages_blocks_countdown" USING btree ("_path");
  CREATE INDEX "pages_blocks_countdown_locale_idx" ON "payload"."pages_blocks_countdown" USING btree ("_locale");
  CREATE INDEX "pages_blocks_tabs_items_order_idx" ON "payload"."pages_blocks_tabs_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_tabs_items_parent_id_idx" ON "payload"."pages_blocks_tabs_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_tabs_items_locale_idx" ON "payload"."pages_blocks_tabs_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_tabs_order_idx" ON "payload"."pages_blocks_tabs" USING btree ("_order");
  CREATE INDEX "pages_blocks_tabs_parent_id_idx" ON "payload"."pages_blocks_tabs" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_tabs_path_idx" ON "payload"."pages_blocks_tabs" USING btree ("_path");
  CREATE INDEX "pages_blocks_tabs_locale_idx" ON "payload"."pages_blocks_tabs" USING btree ("_locale");
  CREATE INDEX "pages_blocks_feature_grid_items_order_idx" ON "payload"."pages_blocks_feature_grid_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_feature_grid_items_parent_id_idx" ON "payload"."pages_blocks_feature_grid_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_feature_grid_items_locale_idx" ON "payload"."pages_blocks_feature_grid_items" USING btree ("_locale");
  CREATE INDEX "pages_blocks_feature_grid_order_idx" ON "payload"."pages_blocks_feature_grid" USING btree ("_order");
  CREATE INDEX "pages_blocks_feature_grid_parent_id_idx" ON "payload"."pages_blocks_feature_grid" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_feature_grid_path_idx" ON "payload"."pages_blocks_feature_grid" USING btree ("_path");
  CREATE INDEX "pages_blocks_feature_grid_locale_idx" ON "payload"."pages_blocks_feature_grid" USING btree ("_locale");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."pages_blocks_pricing_table_tiers_features" CASCADE;
  DROP TABLE "payload"."pages_blocks_pricing_table_tiers" CASCADE;
  DROP TABLE "payload"."pages_blocks_pricing_table" CASCADE;
  DROP TABLE "payload"."pages_blocks_countdown" CASCADE;
  DROP TABLE "payload"."pages_blocks_tabs_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_tabs" CASCADE;
  DROP TABLE "payload"."pages_blocks_feature_grid_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_feature_grid" CASCADE;
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_hero_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_hero_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_hero_container_width";
  ALTER TABLE "payload"."pages_blocks_hero" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_hero_container_width" USING "container_width"::"payload"."enum_pages_blocks_hero_container_width";
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_featured_collection_container_width";
  ALTER TABLE "payload"."pages_blocks_featured_collection" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_featured_collection_container_width" USING "container_width"::"payload"."enum_pages_blocks_featured_collection_container_width";
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_featured_products_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_featured_products_container_width";
  ALTER TABLE "payload"."pages_blocks_featured_products" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_featured_products_container_width" USING "container_width"::"payload"."enum_pages_blocks_featured_products_container_width";
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_rich_text_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_rich_text_container_width";
  ALTER TABLE "payload"."pages_blocks_rich_text" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_rich_text_container_width" USING "container_width"::"payload"."enum_pages_blocks_rich_text_container_width";
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_image_with_text_container_width";
  ALTER TABLE "payload"."pages_blocks_image_with_text" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_image_with_text_container_width" USING "container_width"::"payload"."enum_pages_blocks_image_with_text_container_width";
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_gallery_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_gallery_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_gallery_container_width";
  ALTER TABLE "payload"."pages_blocks_gallery" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_gallery_container_width" USING "container_width"::"payload"."enum_pages_blocks_gallery_container_width";
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_testimonials_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_testimonials_container_width";
  ALTER TABLE "payload"."pages_blocks_testimonials" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_testimonials_container_width" USING "container_width"::"payload"."enum_pages_blocks_testimonials_container_width";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_logo_cloud_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_logo_cloud_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_logo_cloud_container_width";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_logo_cloud_container_width" USING "container_width"::"payload"."enum_pages_blocks_logo_cloud_container_width";
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_newsletter_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_newsletter_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_newsletter_container_width";
  ALTER TABLE "payload"."pages_blocks_newsletter" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_newsletter_container_width" USING "container_width"::"payload"."enum_pages_blocks_newsletter_container_width";
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_faq_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_faq_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_faq_container_width";
  ALTER TABLE "payload"."pages_blocks_faq" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_faq_container_width" USING "container_width"::"payload"."enum_pages_blocks_faq_container_width";
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_promo_banner_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_promo_banner_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_promo_banner_container_width";
  ALTER TABLE "payload"."pages_blocks_promo_banner" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_promo_banner_container_width" USING "container_width"::"payload"."enum_pages_blocks_promo_banner_container_width";
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_video_embed_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_video_embed_container_width";
  ALTER TABLE "payload"."pages_blocks_video_embed" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_video_embed_container_width" USING "container_width"::"payload"."enum_pages_blocks_video_embed_container_width";
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_divider_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_divider_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_divider_container_width";
  ALTER TABLE "payload"."pages_blocks_divider" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_divider_container_width" USING "container_width"::"payload"."enum_pages_blocks_divider_container_width";
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_recommendations_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_recommendations_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_recommendations_container_width";
  ALTER TABLE "payload"."pages_blocks_recommendations" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_recommendations_container_width" USING "container_width"::"payload"."enum_pages_blocks_recommendations_container_width";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_recently_viewed_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_recently_viewed_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_recently_viewed_container_width";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_recently_viewed_container_width" USING "container_width"::"payload"."enum_pages_blocks_recently_viewed_container_width";
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_button_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_button_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_button_container_width";
  ALTER TABLE "payload"."pages_blocks_button" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_button_container_width" USING "container_width"::"payload"."enum_pages_blocks_button_container_width";
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_text_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_text_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_text_container_width";
  ALTER TABLE "payload"."pages_blocks_text" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_text_container_width" USING "container_width"::"payload"."enum_pages_blocks_text_container_width";
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_social_bar_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_social_bar_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_social_bar_container_width";
  ALTER TABLE "payload"."pages_blocks_social_bar" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_social_bar_container_width" USING "container_width"::"payload"."enum_pages_blocks_social_bar_container_width";
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_spacer_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_spacer_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_spacer_container_width";
  ALTER TABLE "payload"."pages_blocks_spacer" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_spacer_container_width" USING "container_width"::"payload"."enum_pages_blocks_spacer_container_width";
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_columns_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_columns_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_columns_container_width";
  ALTER TABLE "payload"."pages_blocks_columns" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_columns_container_width" USING "container_width"::"payload"."enum_pages_blocks_columns_container_width";
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_call_to_action_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_call_to_action_container_width";
  ALTER TABLE "payload"."pages_blocks_call_to_action" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_call_to_action_container_width" USING "container_width"::"payload"."enum_pages_blocks_call_to_action_container_width";
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_stats_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_stats_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_stats_container_width";
  ALTER TABLE "payload"."pages_blocks_stats" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_stats_container_width" USING "container_width"::"payload"."enum_pages_blocks_stats_container_width";
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_quote_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_quote_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_quote_container_width";
  ALTER TABLE "payload"."pages_blocks_quote" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_quote_container_width" USING "container_width"::"payload"."enum_pages_blocks_quote_container_width";
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_card_grid_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_card_grid_container_width";
  ALTER TABLE "payload"."pages_blocks_card_grid" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_card_grid_container_width" USING "container_width"::"payload"."enum_pages_blocks_card_grid_container_width";
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_banner_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_banner_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_banner_container_width";
  ALTER TABLE "payload"."pages_blocks_banner" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_banner_container_width" USING "container_width"::"payload"."enum_pages_blocks_banner_container_width";
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "container_width" SET DATA TYPE text;
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "container_width" SET DEFAULT 'normal'::text;
  DROP TYPE "payload"."enum_pages_blocks_steps_container_width";
  CREATE TYPE "payload"."enum_pages_blocks_steps_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "container_width" SET DEFAULT 'normal'::"payload"."enum_pages_blocks_steps_container_width";
  ALTER TABLE "payload"."pages_blocks_steps" ALTER COLUMN "container_width" SET DATA TYPE "payload"."enum_pages_blocks_steps_container_width" USING "container_width"::"payload"."enum_pages_blocks_steps_container_width";
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_collection" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_featured_collection" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_featured_collection" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_featured_collection" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_featured_collection" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_featured_products" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_featured_products" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_featured_products" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_featured_products" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_featured_products" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_rich_text" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_rich_text" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_rich_text" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_rich_text" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_rich_text" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_image_with_text" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_gallery" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_gallery" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_gallery" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_gallery" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_gallery" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_testimonials" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_testimonials" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_testimonials" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_testimonials" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_testimonials" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_logo_cloud" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_newsletter" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_newsletter" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_newsletter" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_newsletter" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_newsletter" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_faq" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_faq" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_faq" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_faq" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_faq" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_promo_banner" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_video_embed" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_video_embed" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_video_embed" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_video_embed" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_video_embed" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_divider" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_divider" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_divider" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_divider" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_divider" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recommendations" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_recommendations" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_recommendations" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_recommendations" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_recommendations" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_recently_viewed" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_button" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_button" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_button" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_button" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_button" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_text" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_text" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_text" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_text" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_text" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_social_bar" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_social_bar" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_social_bar" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_social_bar" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_social_bar" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_spacer" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_spacer" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_spacer" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_spacer" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_spacer" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_columns" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_columns" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_columns" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_columns" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_columns" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_call_to_action" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_call_to_action" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_call_to_action" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_call_to_action" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_call_to_action" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_stats" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_stats" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_stats" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_stats" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_stats" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_quote" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_quote" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_quote" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_quote" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_quote" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_card_grid" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_card_grid" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_card_grid" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_card_grid" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_card_grid" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_banner" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_banner" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_banner" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_banner" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_banner" DROP COLUMN "scroll_animation";
  ALTER TABLE "payload"."pages_blocks_steps" DROP COLUMN "max_width_custom";
  ALTER TABLE "payload"."pages_blocks_steps" DROP COLUMN "content_align";
  ALTER TABLE "payload"."pages_blocks_steps" DROP COLUMN "rounded";
  ALTER TABLE "payload"."pages_blocks_steps" DROP COLUMN "border";
  ALTER TABLE "payload"."pages_blocks_steps" DROP COLUMN "scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_hero_content_align";
  DROP TYPE "payload"."enum_pages_blocks_hero_rounded";
  DROP TYPE "payload"."enum_pages_blocks_hero_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_content_align";
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_rounded";
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_featured_products_content_align";
  DROP TYPE "payload"."enum_pages_blocks_featured_products_rounded";
  DROP TYPE "payload"."enum_pages_blocks_featured_products_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_rich_text_content_align";
  DROP TYPE "payload"."enum_pages_blocks_rich_text_rounded";
  DROP TYPE "payload"."enum_pages_blocks_rich_text_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_content_align";
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_rounded";
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_gallery_content_align";
  DROP TYPE "payload"."enum_pages_blocks_gallery_rounded";
  DROP TYPE "payload"."enum_pages_blocks_gallery_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_testimonials_content_align";
  DROP TYPE "payload"."enum_pages_blocks_testimonials_rounded";
  DROP TYPE "payload"."enum_pages_blocks_testimonials_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_logo_cloud_content_align";
  DROP TYPE "payload"."enum_pages_blocks_logo_cloud_rounded";
  DROP TYPE "payload"."enum_pages_blocks_logo_cloud_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_newsletter_content_align";
  DROP TYPE "payload"."enum_pages_blocks_newsletter_rounded";
  DROP TYPE "payload"."enum_pages_blocks_newsletter_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_faq_content_align";
  DROP TYPE "payload"."enum_pages_blocks_faq_rounded";
  DROP TYPE "payload"."enum_pages_blocks_faq_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_promo_banner_content_align";
  DROP TYPE "payload"."enum_pages_blocks_promo_banner_rounded";
  DROP TYPE "payload"."enum_pages_blocks_promo_banner_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_video_embed_content_align";
  DROP TYPE "payload"."enum_pages_blocks_video_embed_rounded";
  DROP TYPE "payload"."enum_pages_blocks_video_embed_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_divider_content_align";
  DROP TYPE "payload"."enum_pages_blocks_divider_rounded";
  DROP TYPE "payload"."enum_pages_blocks_divider_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_recommendations_content_align";
  DROP TYPE "payload"."enum_pages_blocks_recommendations_rounded";
  DROP TYPE "payload"."enum_pages_blocks_recommendations_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_recently_viewed_content_align";
  DROP TYPE "payload"."enum_pages_blocks_recently_viewed_rounded";
  DROP TYPE "payload"."enum_pages_blocks_recently_viewed_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_button_content_align";
  DROP TYPE "payload"."enum_pages_blocks_button_rounded";
  DROP TYPE "payload"."enum_pages_blocks_button_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_text_content_align";
  DROP TYPE "payload"."enum_pages_blocks_text_rounded";
  DROP TYPE "payload"."enum_pages_blocks_text_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_content_align";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_rounded";
  DROP TYPE "payload"."enum_pages_blocks_social_bar_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_spacer_content_align";
  DROP TYPE "payload"."enum_pages_blocks_spacer_rounded";
  DROP TYPE "payload"."enum_pages_blocks_spacer_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_columns_content_align";
  DROP TYPE "payload"."enum_pages_blocks_columns_rounded";
  DROP TYPE "payload"."enum_pages_blocks_columns_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_content_align";
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_rounded";
  DROP TYPE "payload"."enum_pages_blocks_call_to_action_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_stats_content_align";
  DROP TYPE "payload"."enum_pages_blocks_stats_rounded";
  DROP TYPE "payload"."enum_pages_blocks_stats_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_quote_content_align";
  DROP TYPE "payload"."enum_pages_blocks_quote_rounded";
  DROP TYPE "payload"."enum_pages_blocks_quote_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_card_grid_content_align";
  DROP TYPE "payload"."enum_pages_blocks_card_grid_rounded";
  DROP TYPE "payload"."enum_pages_blocks_card_grid_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_banner_content_align";
  DROP TYPE "payload"."enum_pages_blocks_banner_rounded";
  DROP TYPE "payload"."enum_pages_blocks_banner_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_steps_content_align";
  DROP TYPE "payload"."enum_pages_blocks_steps_rounded";
  DROP TYPE "payload"."enum_pages_blocks_steps_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_pricing_table_background";
  DROP TYPE "payload"."enum_pages_blocks_pricing_table_container_width";
  DROP TYPE "payload"."enum_pages_blocks_pricing_table_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_pricing_table_content_align";
  DROP TYPE "payload"."enum_pages_blocks_pricing_table_rounded";
  DROP TYPE "payload"."enum_pages_blocks_pricing_table_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_countdown_background";
  DROP TYPE "payload"."enum_pages_blocks_countdown_container_width";
  DROP TYPE "payload"."enum_pages_blocks_countdown_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_countdown_content_align";
  DROP TYPE "payload"."enum_pages_blocks_countdown_rounded";
  DROP TYPE "payload"."enum_pages_blocks_countdown_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_tabs_variant";
  DROP TYPE "payload"."enum_pages_blocks_tabs_background";
  DROP TYPE "payload"."enum_pages_blocks_tabs_container_width";
  DROP TYPE "payload"."enum_pages_blocks_tabs_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_tabs_content_align";
  DROP TYPE "payload"."enum_pages_blocks_tabs_rounded";
  DROP TYPE "payload"."enum_pages_blocks_tabs_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_items_icon";
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_columns";
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_background";
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_container_width";
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_content_align";
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_rounded";
  DROP TYPE "payload"."enum_pages_blocks_feature_grid_scroll_animation";`)
}
