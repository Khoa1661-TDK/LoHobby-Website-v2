import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the schema for two page-builder blocks that were registered in the Payload
// config (src/payload/blocks/index.ts) but never migrated: `youtubeChannel` and
// `reelCarousel`. Without these tables the homepage query fails with
// `relation "payload.pages_blocks_youtube_channel" does not exist`.
//
// Required block fields are left nullable on purpose: the visual builder autosaves
// blocks before they are filled in, so validation lives in the render layer, not the
// DB (see 20260621_053000_relax_page_block_required). The reel `platform` select keeps
// NOT NULL because it always has a default (matches 20260630_142912_info_section_block).
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE TYPE "payload"."enum_pages_blocks_youtube_channel_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_youtube_channel_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_youtube_channel_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_youtube_channel_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_youtube_channel_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_youtube_channel_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');
  CREATE TYPE "payload"."enum_pages_blocks_reel_carousel_reels_platform" AS ENUM('youtube', 'tiktok', 'facebook');
  CREATE TYPE "payload"."enum_pages_blocks_reel_carousel_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_reel_carousel_container_width" AS ENUM('narrow', 'normal', 'wide', 'full', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_reel_carousel_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_reel_carousel_content_align" AS ENUM('left', 'center', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_reel_carousel_rounded" AS ENUM('none', 'sm', 'md', 'lg', 'xl');
  CREATE TYPE "payload"."enum_pages_blocks_reel_carousel_scroll_animation" AS ENUM('default', 'none', 'fade-up', 'fade-in', 'slide-right', 'scale-in', 'stagger-cards', 'stagger-list', 'hero-entrance');

  CREATE TABLE "payload"."pages_blocks_youtube_channel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"channel_identifier" varchar,
  	"channel_url" varchar,
  	"subscribe_label" varchar,
  	"show_subscribers" boolean DEFAULT true,
  	"show_views" boolean DEFAULT true,
  	"show_videos" boolean DEFAULT false,
  	"manual_name" varchar,
  	"manual_avatar_id" integer,
  	"manual_subscribers" varchar,
  	"manual_views" varchar,
  	"manual_videos" varchar,
  	"background" "payload"."enum_pages_blocks_youtube_channel_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_youtube_channel_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_youtube_channel_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_youtube_channel_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_youtube_channel_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_youtube_channel_scroll_animation" DEFAULT 'default',
  	"block_key" varchar,
  	"block_name" varchar
  );

  CREATE TABLE "payload"."pages_blocks_reel_carousel_reels" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"platform" "payload"."enum_pages_blocks_reel_carousel_reels_platform" DEFAULT 'youtube' NOT NULL,
  	"url" varchar,
  	"poster_id" integer,
  	"caption" varchar,
  	"views" varchar
  );

  CREATE TABLE "payload"."pages_blocks_reel_carousel" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"_locale" "payload"."_locales" NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"heading" varchar,
  	"follow_label" varchar,
  	"follow_href" varchar,
  	"background" "payload"."enum_pages_blocks_reel_carousel_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"background_custom_dark" varchar,
  	"container_width" "payload"."enum_pages_blocks_reel_carousel_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_reel_carousel_padding_y" DEFAULT 'base',
  	"max_width_custom" varchar,
  	"content_align" "payload"."enum_pages_blocks_reel_carousel_content_align" DEFAULT 'left',
  	"rounded" "payload"."enum_pages_blocks_reel_carousel_rounded" DEFAULT 'none',
  	"border" boolean DEFAULT false,
  	"scroll_animation" "payload"."enum_pages_blocks_reel_carousel_scroll_animation" DEFAULT 'default',
  	"block_key" varchar,
  	"block_name" varchar
  );

  ALTER TABLE "payload"."pages_blocks_youtube_channel" ADD CONSTRAINT "pages_blocks_youtube_channel_manual_avatar_id_media_id_fk" FOREIGN KEY ("manual_avatar_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_youtube_channel" ADD CONSTRAINT "pages_blocks_youtube_channel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_reel_carousel_reels" ADD CONSTRAINT "pages_blocks_reel_carousel_reels_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_reel_carousel_reels" ADD CONSTRAINT "pages_blocks_reel_carousel_reels_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_reel_carousel"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_reel_carousel" ADD CONSTRAINT "pages_blocks_reel_carousel_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "pages_blocks_youtube_channel_order_idx" ON "payload"."pages_blocks_youtube_channel" USING btree ("_order");
  CREATE INDEX "pages_blocks_youtube_channel_parent_id_idx" ON "payload"."pages_blocks_youtube_channel" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_youtube_channel_path_idx" ON "payload"."pages_blocks_youtube_channel" USING btree ("_path");
  CREATE INDEX "pages_blocks_youtube_channel_locale_idx" ON "payload"."pages_blocks_youtube_channel" USING btree ("_locale");
  CREATE INDEX "pages_blocks_youtube_channel_manual_avatar_idx" ON "payload"."pages_blocks_youtube_channel" USING btree ("manual_avatar_id");
  CREATE INDEX "pages_blocks_reel_carousel_reels_order_idx" ON "payload"."pages_blocks_reel_carousel_reels" USING btree ("_order");
  CREATE INDEX "pages_blocks_reel_carousel_reels_parent_id_idx" ON "payload"."pages_blocks_reel_carousel_reels" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_reel_carousel_reels_locale_idx" ON "payload"."pages_blocks_reel_carousel_reels" USING btree ("_locale");
  CREATE INDEX "pages_blocks_reel_carousel_reels_poster_idx" ON "payload"."pages_blocks_reel_carousel_reels" USING btree ("poster_id");
  CREATE INDEX "pages_blocks_reel_carousel_order_idx" ON "payload"."pages_blocks_reel_carousel" USING btree ("_order");
  CREATE INDEX "pages_blocks_reel_carousel_parent_id_idx" ON "payload"."pages_blocks_reel_carousel" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_reel_carousel_path_idx" ON "payload"."pages_blocks_reel_carousel" USING btree ("_path");
  CREATE INDEX "pages_blocks_reel_carousel_locale_idx" ON "payload"."pages_blocks_reel_carousel" USING btree ("_locale");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP TABLE "payload"."pages_blocks_reel_carousel_reels" CASCADE;
  DROP TABLE "payload"."pages_blocks_reel_carousel" CASCADE;
  DROP TABLE "payload"."pages_blocks_youtube_channel" CASCADE;
  DROP TYPE "payload"."enum_pages_blocks_youtube_channel_background";
  DROP TYPE "payload"."enum_pages_blocks_youtube_channel_container_width";
  DROP TYPE "payload"."enum_pages_blocks_youtube_channel_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_youtube_channel_content_align";
  DROP TYPE "payload"."enum_pages_blocks_youtube_channel_rounded";
  DROP TYPE "payload"."enum_pages_blocks_youtube_channel_scroll_animation";
  DROP TYPE "payload"."enum_pages_blocks_reel_carousel_reels_platform";
  DROP TYPE "payload"."enum_pages_blocks_reel_carousel_background";
  DROP TYPE "payload"."enum_pages_blocks_reel_carousel_container_width";
  DROP TYPE "payload"."enum_pages_blocks_reel_carousel_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_reel_carousel_content_align";
  DROP TYPE "payload"."enum_pages_blocks_reel_carousel_rounded";
  DROP TYPE "payload"."enum_pages_blocks_reel_carousel_scroll_animation";`)
}
