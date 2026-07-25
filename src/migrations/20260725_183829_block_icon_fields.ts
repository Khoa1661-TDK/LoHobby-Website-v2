import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the shared `icon` select to eight existing page-builder blocks.
//
// HAND-TRIMMED from Payload's generated migration. `payload migrate:create` bundled
// these additive statements with unrelated destructive ones (DROP TABLE
// site_header_hidden_defaults, DROP COLUMN on categories/products/product_variants and
// ten pages_blocks_spotlight columns) caused by pre-existing schema drift on the dev
// database. Only the icon statements below were kept; every CREATE TYPE / ADD COLUMN
// is copied verbatim from that generated output. The drift is a separate problem.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_pages_blocks_call_to_action_icon" AS ENUM('truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag', 'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet', 'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up', 'star', 'heart', 'headphones', 'life-buoy', 'handshake', 'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors', 'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush', 'arrow-right', 'arrow-up-right', 'check', 'circle-check', 'circle-help', 'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search', 'zap', 'flame', 'trending-up', 'chart-column', 'users', 'user', 'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play', 'image', 'video', 'file-text', 'book-open');
  CREATE TYPE "payload"."enum_pages_blocks_stats_items_icon" AS ENUM('truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag', 'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet', 'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up', 'star', 'heart', 'headphones', 'life-buoy', 'handshake', 'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors', 'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush', 'arrow-right', 'arrow-up-right', 'check', 'circle-check', 'circle-help', 'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search', 'zap', 'flame', 'trending-up', 'chart-column', 'users', 'user', 'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play', 'image', 'video', 'file-text', 'book-open');
  CREATE TYPE "payload"."enum_pages_blocks_card_grid_cards_icon" AS ENUM('truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag', 'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet', 'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up', 'star', 'heart', 'headphones', 'life-buoy', 'handshake', 'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors', 'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush', 'arrow-right', 'arrow-up-right', 'check', 'circle-check', 'circle-help', 'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search', 'zap', 'flame', 'trending-up', 'chart-column', 'users', 'user', 'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play', 'image', 'video', 'file-text', 'book-open');
  CREATE TYPE "payload"."enum_pages_blocks_banner_icon" AS ENUM('truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag', 'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet', 'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up', 'star', 'heart', 'headphones', 'life-buoy', 'handshake', 'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors', 'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush', 'arrow-right', 'arrow-up-right', 'check', 'circle-check', 'circle-help', 'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search', 'zap', 'flame', 'trending-up', 'chart-column', 'users', 'user', 'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play', 'image', 'video', 'file-text', 'book-open');
  CREATE TYPE "payload"."enum_pages_blocks_steps_steps_icon" AS ENUM('truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag', 'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet', 'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up', 'star', 'heart', 'headphones', 'life-buoy', 'handshake', 'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors', 'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush', 'arrow-right', 'arrow-up-right', 'check', 'circle-check', 'circle-help', 'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search', 'zap', 'flame', 'trending-up', 'chart-column', 'users', 'user', 'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play', 'image', 'video', 'file-text', 'book-open');
  CREATE TYPE "payload"."enum_pages_blocks_pricing_table_tiers_icon" AS ENUM('truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag', 'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet', 'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up', 'star', 'heart', 'headphones', 'life-buoy', 'handshake', 'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors', 'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush', 'arrow-right', 'arrow-up-right', 'check', 'circle-check', 'circle-help', 'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search', 'zap', 'flame', 'trending-up', 'chart-column', 'users', 'user', 'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play', 'image', 'video', 'file-text', 'book-open');
  CREATE TYPE "payload"."enum_pages_blocks_tabs_items_icon" AS ENUM('truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag', 'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet', 'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up', 'star', 'heart', 'headphones', 'life-buoy', 'handshake', 'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors', 'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush', 'arrow-right', 'arrow-up-right', 'check', 'circle-check', 'circle-help', 'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search', 'zap', 'flame', 'trending-up', 'chart-column', 'users', 'user', 'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play', 'image', 'video', 'file-text', 'book-open');
  CREATE TYPE "payload"."enum_pages_blocks_info_section_links_icon" AS ENUM('truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag', 'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet', 'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up', 'star', 'heart', 'headphones', 'life-buoy', 'handshake', 'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors', 'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush', 'arrow-right', 'arrow-up-right', 'check', 'circle-check', 'circle-help', 'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search', 'zap', 'flame', 'trending-up', 'chart-column', 'users', 'user', 'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play', 'image', 'video', 'file-text', 'book-open');

  ALTER TABLE "payload"."pages_blocks_call_to_action" ADD COLUMN "icon" "payload"."enum_pages_blocks_call_to_action_icon";
  ALTER TABLE "payload"."pages_blocks_stats_items" ADD COLUMN "icon" "payload"."enum_pages_blocks_stats_items_icon";
  ALTER TABLE "payload"."pages_blocks_card_grid_cards" ADD COLUMN "icon" "payload"."enum_pages_blocks_card_grid_cards_icon";
  ALTER TABLE "payload"."pages_blocks_banner" ADD COLUMN "icon" "payload"."enum_pages_blocks_banner_icon";
  ALTER TABLE "payload"."pages_blocks_steps_steps" ADD COLUMN "icon" "payload"."enum_pages_blocks_steps_steps_icon";
  ALTER TABLE "payload"."pages_blocks_pricing_table_tiers" ADD COLUMN "icon" "payload"."enum_pages_blocks_pricing_table_tiers_icon";
  ALTER TABLE "payload"."pages_blocks_tabs_items" ADD COLUMN "icon" "payload"."enum_pages_blocks_tabs_items_icon";
  ALTER TABLE "payload"."pages_blocks_info_section_links" ADD COLUMN "icon" "payload"."enum_pages_blocks_info_section_links_icon";
`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "payload"."pages_blocks_call_to_action" DROP COLUMN IF EXISTS "icon";
  ALTER TABLE "payload"."pages_blocks_stats_items" DROP COLUMN IF EXISTS "icon";
  ALTER TABLE "payload"."pages_blocks_card_grid_cards" DROP COLUMN IF EXISTS "icon";
  ALTER TABLE "payload"."pages_blocks_banner" DROP COLUMN IF EXISTS "icon";
  ALTER TABLE "payload"."pages_blocks_steps_steps" DROP COLUMN IF EXISTS "icon";
  ALTER TABLE "payload"."pages_blocks_pricing_table_tiers" DROP COLUMN IF EXISTS "icon";
  ALTER TABLE "payload"."pages_blocks_tabs_items" DROP COLUMN IF EXISTS "icon";
  ALTER TABLE "payload"."pages_blocks_info_section_links" DROP COLUMN IF EXISTS "icon";
  DROP TYPE IF EXISTS "payload"."enum_pages_blocks_call_to_action_icon";
  DROP TYPE IF EXISTS "payload"."enum_pages_blocks_stats_items_icon";
  DROP TYPE IF EXISTS "payload"."enum_pages_blocks_card_grid_cards_icon";
  DROP TYPE IF EXISTS "payload"."enum_pages_blocks_banner_icon";
  DROP TYPE IF EXISTS "payload"."enum_pages_blocks_steps_steps_icon";
  DROP TYPE IF EXISTS "payload"."enum_pages_blocks_pricing_table_tiers_icon";
  DROP TYPE IF EXISTS "payload"."enum_pages_blocks_tabs_items_icon";
  DROP TYPE IF EXISTS "payload"."enum_pages_blocks_info_section_links_icon";
`)
}
