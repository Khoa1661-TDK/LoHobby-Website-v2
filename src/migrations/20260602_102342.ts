import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_products_stored_gallery_kind" AS ENUM('image', 'video');
  CREATE TYPE "payload"."enum_products_stored_image_kind" AS ENUM('image', 'video');
  CREATE TYPE "payload"."enum_payment_methods_kind" AS ENUM('cod', 'manual_transfer', 'gateway');
  CREATE TYPE "payload"."enum_payment_methods_provider" AS ENUM('payos', 'stripe', 'momo', 'zalopay', 'vnpay', 'shopeepay');
  CREATE TYPE "payload"."enum_orders_shipment_events_status" AS ENUM('awaiting_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed');
  CREATE TYPE "payload"."enum_orders_payment_status" AS ENUM('pending', 'paid', 'failed', 'refunded');
  CREATE TYPE "payload"."enum_orders_order_status" AS ENUM('pending', 'processing', 'shipped', 'delivered', 'canceled');
  CREATE TYPE "payload"."enum_orders_delivery_method" AS ENUM('SHIPMENT', 'PICKUP');
  CREATE TYPE "payload"."enum_orders_shipping_carrier_key" AS ENUM('ghn', 'ghtk', 'viettel_post', 'jt_express', 'spx', 'vnpost', 'other');
  CREATE TYPE "payload"."enum_orders_shipment_status" AS ENUM('awaiting_pickup', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed');
  CREATE TYPE "payload"."enum_pages_blocks_hero_cta_style" AS ENUM('primary', 'outline', 'minimal');
  CREATE TYPE "payload"."enum_pages_blocks_hero_image_position" AS ENUM('left', 'right', 'background', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_hero_text_align" AS ENUM('left', 'center');
  CREATE TYPE "payload"."enum_pages_blocks_hero_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_hero_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_hero_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_layout" AS ENUM('grid', 'carousel');
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_featured_collection_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_layout" AS ENUM('grid', 'carousel');
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_featured_products_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_text_align" AS ENUM('left', 'center');
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_rich_text_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_image_position" AS ENUM('left', 'right');
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_image_ratio" AS ENUM('1/1', '4/3', '3/4', '16/9');
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_image_with_text_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_gallery_layout" AS ENUM('grid', 'row', 'bento');
  CREATE TYPE "payload"."enum_pages_blocks_gallery_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_gallery_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_gallery_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_layout" AS ENUM('grid', 'single');
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_testimonials_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_logo_cloud_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_logo_cloud_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_logo_cloud_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_newsletter_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_newsletter_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_newsletter_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_faq_layout" AS ENUM('accordion', 'twoCol');
  CREATE TYPE "payload"."enum_pages_blocks_faq_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_faq_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_faq_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_promo_banner_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_promo_banner_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_promo_banner_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_aspect_ratio" AS ENUM('16/9', '4/3', '1/1');
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_video_embed_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_blocks_divider_style" AS ENUM('line', 'dashed', 'space', 'gradient');
  CREATE TYPE "payload"."enum_pages_blocks_divider_background" AS ENUM('theme', 'light', 'dark', 'custom');
  CREATE TYPE "payload"."enum_pages_blocks_divider_container_width" AS ENUM('narrow', 'normal', 'wide', 'full');
  CREATE TYPE "payload"."enum_pages_blocks_divider_padding_y" AS ENUM('compact', 'base', 'spacious', 'none');
  CREATE TYPE "payload"."enum_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "payload"."enum_exports_format" AS ENUM('csv', 'json');
  CREATE TYPE "payload"."enum_exports_drafts" AS ENUM('yes', 'no');
  CREATE TYPE "payload"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'createCollectionExport');
  CREATE TYPE "payload"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "payload"."enum_payload_jobs_task_slug" AS ENUM('inline', 'createCollectionExport');
  CREATE TYPE "payload"."enum_site_header_hidden_defaults" AS ENUM('home', 'shop', 'categories');
  CREATE TYPE "payload"."enum_site_header_tabs_kind" AS ENUM('home', 'all-products', 'category', 'custom', 'dropdown');
  CREATE TYPE "payload"."enum_store_settings_font_preset" AS ENUM('jakarta', 'inter', 'roboto', 'system');
  CREATE TYPE "payload"."enum_dropship_settings_provider" AS ENUM('cj', 'manual');
  CREATE TABLE "payload"."users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload"."categories_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"subtitle" varchar,
  	"content" jsonb,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."products_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "payload"."products_stored_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar,
  	"alt" varchar,
  	"width" numeric,
  	"height" numeric,
  	"kind" "payload"."enum_products_stored_gallery_kind"
  );
  
  CREATE TABLE "payload"."products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"price" numeric NOT NULL,
  	"on_sale" boolean DEFAULT false,
  	"sale_percent" numeric DEFAULT 10,
  	"description" varchar,
  	"available" boolean DEFAULT true,
  	"stock" numeric,
  	"image_id" integer,
  	"stored_image_url" varchar,
  	"stored_image_alt" varchar,
  	"stored_image_width" numeric,
  	"stored_image_height" numeric,
  	"stored_image_kind" "payload"."enum_products_stored_image_kind",
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"categories_id" integer
  );
  
  CREATE TABLE "payload"."product_variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"sku" varchar NOT NULL,
  	"price_override" numeric,
  	"stock" numeric DEFAULT 0 NOT NULL,
  	"image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payment_methods" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"description" varchar,
  	"enabled" boolean DEFAULT true,
  	"sort_order" numeric DEFAULT 0,
  	"kind" "payload"."enum_payment_methods_kind" DEFAULT 'manual_transfer' NOT NULL,
  	"icon_id" integer,
  	"provider" "payload"."enum_payment_methods_provider",
  	"gateway_credentials_sandbox_mode" boolean DEFAULT true,
  	"gateway_credentials_client_id" varchar,
  	"gateway_credentials_api_key" varchar,
  	"gateway_credentials_checksum_key" varchar,
  	"gateway_credentials_secret_key" varchar,
  	"gateway_credentials_webhook_secret" varchar,
  	"gateway_credentials_partner_code" varchar,
  	"gateway_credentials_access_key" varchar,
  	"gateway_credentials_partner_key" varchar,
  	"gateway_credentials_merchant_ext_id" varchar,
  	"gateway_credentials_app_id" varchar,
  	"gateway_credentials_key1" varchar,
  	"gateway_credentials_key2" varchar,
  	"gateway_credentials_tmn_code" varchar,
  	"gateway_credentials_hash_secret" varchar,
  	"gateway_credentials_credentials_enc" varchar,
  	"transfer_details_bank_name" varchar,
  	"transfer_details_account_number" varchar,
  	"transfer_details_account_holder" varchar,
  	"transfer_details_transfer_note" varchar,
  	"transfer_details_qr_image_id" integer,
  	"instructions" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."carts_cart_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" integer NOT NULL,
  	"variant_id" varchar NOT NULL,
  	"quantity" numeric NOT NULL
  );
  
  CREATE TABLE "payload"."carts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"session_id" varchar,
  	"customer_id" integer,
  	"completed" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."orders_line_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"product_id" varchar NOT NULL,
  	"product_title" varchar,
  	"product_handle" varchar,
  	"variant_sku" varchar,
  	"variant_name" varchar,
  	"quantity" numeric NOT NULL,
  	"unit_price" numeric NOT NULL
  );
  
  CREATE TABLE "payload"."orders_shipment_events" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"status" "payload"."enum_orders_shipment_events_status" NOT NULL,
  	"message" varchar NOT NULL,
  	"location" varchar,
  	"occurred_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."orders" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order_id" varchar NOT NULL,
  	"total_amount" numeric NOT NULL,
  	"subtotal_amount" numeric,
  	"shipping_amount" numeric DEFAULT 0,
  	"discount_amount" numeric DEFAULT 0,
  	"tax_amount" numeric DEFAULT 0,
  	"gift_card_amount" numeric DEFAULT 0,
  	"coupon_code" varchar,
  	"gift_card_code" varchar,
  	"currency" varchar DEFAULT 'VND' NOT NULL,
  	"customer_id" integer,
  	"cart_id" integer,
  	"payment_status" "payload"."enum_orders_payment_status" DEFAULT 'pending' NOT NULL,
  	"order_status" "payload"."enum_orders_order_status" DEFAULT 'pending' NOT NULL,
  	"delivery_method" "payload"."enum_orders_delivery_method",
  	"payment_method_key" varchar,
  	"payment_kind" varchar,
  	"customer_name" varchar,
  	"buyer_email" varchar,
  	"phone_number" varchar,
  	"payment_url" varchar,
  	"paid_at" timestamp(3) with time zone,
  	"confirmed_at" timestamp(3) with time zone,
  	"shipped_at" timestamp(3) with time zone,
  	"delivered_at" timestamp(3) with time zone,
  	"inventory_adjusted" boolean DEFAULT false,
  	"shipping_address" varchar,
  	"shipping_carrier_key" "payload"."enum_orders_shipping_carrier_key",
  	"shipping_carrier" varchar,
  	"tracking_number" varchar,
  	"tracking_url" varchar,
  	"shipment_status" "payload"."enum_orders_shipment_status",
  	"metadata" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."content_pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"headline" varchar NOT NULL,
  	"subheadline" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"image_id" integer,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."content_pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."content_pages_blocks_cta" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar,
  	"button_label" varchar NOT NULL,
  	"button_href" varchar NOT NULL,
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."content_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"published" boolean DEFAULT false,
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."store_customers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"email" varchar NOT NULL,
  	"name" varchar,
  	"prisma_user_id" varchar,
  	"phone" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."pages_blocks_hero" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"headline" varchar NOT NULL,
  	"subheadline" varchar,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"cta_style" "payload"."enum_pages_blocks_hero_cta_style" DEFAULT 'primary',
  	"image_id" integer,
  	"image_position" "payload"."enum_pages_blocks_hero_image_position" DEFAULT 'right',
  	"text_align" "payload"."enum_pages_blocks_hero_text_align" DEFAULT 'left',
  	"background" "payload"."enum_pages_blocks_hero_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_hero_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_hero_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_featured_collection" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"collection_id" integer NOT NULL,
  	"limit" numeric DEFAULT 8,
  	"layout" "payload"."enum_pages_blocks_featured_collection_layout" DEFAULT 'grid',
  	"background" "payload"."enum_pages_blocks_featured_collection_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_featured_collection_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_featured_collection_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_featured_products" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"layout" "payload"."enum_pages_blocks_featured_products_layout" DEFAULT 'grid',
  	"background" "payload"."enum_pages_blocks_featured_products_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_featured_products_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_featured_products_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_rich_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"content" jsonb NOT NULL,
  	"text_align" "payload"."enum_pages_blocks_rich_text_text_align" DEFAULT 'left',
  	"background" "payload"."enum_pages_blocks_rich_text_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_rich_text_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_rich_text_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_image_with_text" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"image_position" "payload"."enum_pages_blocks_image_with_text_image_position" DEFAULT 'left',
  	"headline" varchar NOT NULL,
  	"body" jsonb,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"image_ratio" "payload"."enum_pages_blocks_image_with_text_image_ratio" DEFAULT '1/1',
  	"background" "payload"."enum_pages_blocks_image_with_text_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_image_with_text_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_image_with_text_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_gallery_images" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"caption" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_gallery" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"layout" "payload"."enum_pages_blocks_gallery_layout" DEFAULT 'grid',
  	"background" "payload"."enum_pages_blocks_gallery_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_gallery_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_gallery_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_testimonials_entries" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"quote" varchar NOT NULL,
  	"author" varchar NOT NULL,
  	"role" varchar,
  	"avatar_id" integer,
  	"rating" numeric
  );
  
  CREATE TABLE "payload"."pages_blocks_testimonials" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"layout" "payload"."enum_pages_blocks_testimonials_layout" DEFAULT 'grid',
  	"background" "payload"."enum_pages_blocks_testimonials_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_testimonials_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_testimonials_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_logo_cloud_logos" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer NOT NULL,
  	"alt" varchar NOT NULL,
  	"href" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_logo_cloud" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"animate" boolean DEFAULT false,
  	"background" "payload"."enum_pages_blocks_logo_cloud_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_logo_cloud_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_logo_cloud_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_newsletter" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"headline" varchar NOT NULL,
  	"subheadline" varchar,
  	"placeholder" varchar DEFAULT 'Enter your email',
  	"button_label" varchar DEFAULT 'Subscribe',
  	"disclaimer" varchar,
  	"background" "payload"."enum_pages_blocks_newsletter_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_newsletter_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_newsletter_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."pages_blocks_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"layout" "payload"."enum_pages_blocks_faq_layout" DEFAULT 'accordion',
  	"background" "payload"."enum_pages_blocks_faq_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_faq_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_faq_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_promo_banner" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"cta_label" varchar,
  	"cta_href" varchar,
  	"dismissible" boolean DEFAULT false,
  	"countdown" timestamp(3) with time zone,
  	"background" "payload"."enum_pages_blocks_promo_banner_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_promo_banner_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_promo_banner_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_video_embed" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"url" varchar NOT NULL,
  	"aspect_ratio" "payload"."enum_pages_blocks_video_embed_aspect_ratio" DEFAULT '16/9',
  	"cover_image_id" integer,
  	"background" "payload"."enum_pages_blocks_video_embed_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_video_embed_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_video_embed_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages_blocks_divider" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"style" "payload"."enum_pages_blocks_divider_style" DEFAULT 'line',
  	"show_icon" boolean DEFAULT false,
  	"background" "payload"."enum_pages_blocks_divider_background" DEFAULT 'theme',
  	"background_custom" varchar,
  	"container_width" "payload"."enum_pages_blocks_divider_container_width" DEFAULT 'normal',
  	"padding_y" "payload"."enum_pages_blocks_divider_padding_y" DEFAULT 'base',
  	"block_name" varchar
  );
  
  CREATE TABLE "payload"."pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"slug" varchar,
  	"status" "payload"."enum_pages_status" DEFAULT 'draft',
  	"meta_title" varchar,
  	"meta_description" varchar,
  	"meta_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."pages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"products_id" integer
  );
  
  CREATE TABLE "payload"."exports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"format" "payload"."enum_exports_format" DEFAULT 'csv' NOT NULL,
  	"limit" numeric,
  	"sort" varchar,
  	"drafts" "payload"."enum_exports_drafts" DEFAULT 'yes',
  	"collection_slug" varchar NOT NULL,
  	"where" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload"."exports_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "payload"."enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "payload"."enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload"."payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "payload"."enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"categories_id" integer,
  	"products_id" integer,
  	"product_variants_id" integer,
  	"payment_methods_id" integer,
  	"carts_id" integer,
  	"orders_id" integer,
  	"content_pages_id" integer,
  	"store_customers_id" integer,
  	"pages_id" integer,
  	"exports_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."site_header_hidden_defaults" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "payload"."enum_site_header_hidden_defaults",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "payload"."site_header_tabs_dropdown_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"category_id" integer
  );
  
  CREATE TABLE "payload"."site_header_tabs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"kind" "payload"."enum_site_header_tabs_kind" DEFAULT 'category' NOT NULL,
  	"category_id" integer,
  	"href" varchar,
  	"show_all_categories" boolean DEFAULT false
  );
  
  CREATE TABLE "payload"."site_header" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"announcement_enabled" boolean DEFAULT false,
  	"announcement_text" varchar,
  	"announcement_link" varchar,
  	"announcement_background_color" varchar,
  	"announcement_text_color" varchar,
  	"include_default_tabs" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."store_settings_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"url" varchar NOT NULL
  );
  
  CREATE TABLE "payload"."store_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"store_name" varchar,
  	"store_subtitle" varchar,
  	"logo_id" integer,
  	"logo_dark_id" integer,
  	"favicon_id" integer,
  	"store_description" varchar,
  	"store_description_short" varchar,
  	"primary_color" varchar DEFAULT '#000000',
  	"secondary_color" varchar DEFAULT '#737373',
  	"accent_color" varchar,
  	"font_preset" "payload"."enum_store_settings_font_preset" DEFAULT 'jakarta',
  	"hero_enabled" boolean DEFAULT true,
  	"hero_eyebrow" varchar,
  	"hero_title" varchar,
  	"hero_subtitle" varchar,
  	"hero_cta_label" varchar,
  	"hero_cta_url" varchar,
  	"hero_image_id" integer,
  	"hero_show_carousel" boolean DEFAULT true,
  	"hero_carousel_title" varchar DEFAULT 'New arrivals',
  	"footer_tagline" varchar,
  	"brand_origin" varchar,
  	"footer_description" varchar,
  	"footer_credit" varchar,
  	"footer_show_newsletter" boolean DEFAULT true,
  	"contact_email" varchar,
  	"contact_phone" varchar,
  	"contact_address" varchar,
  	"currency_code" varchar DEFAULT 'VND',
  	"checkout_note" varchar,
  	"returns_policy_url" varchar,
  	"privacy_policy_url" varchar,
  	"tax_enabled" boolean DEFAULT false,
  	"tax_rate_percent" numeric DEFAULT 10,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."shipping_settings_zones" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"region_keywords" varchar NOT NULL,
  	"flat_rate_vnd" numeric DEFAULT 30000,
  	"free_shipping_threshold_vnd" numeric DEFAULT 0
  );
  
  CREATE TABLE "payload"."shipping_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"shipment_enabled" boolean DEFAULT true,
  	"flat_rate_vnd" numeric DEFAULT 30000,
  	"free_shipping_threshold_vnd" numeric DEFAULT 0,
  	"pickup_enabled" boolean DEFAULT true,
  	"pickup_address" varchar DEFAULT 'Trụ sở Lô Hobby, TP. Hồ Chí Minh, Việt Nam',
  	"pickup_instructions" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."dropship_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"provider" "payload"."enum_dropship_settings_provider" DEFAULT 'cj',
  	"api_key" varchar,
  	"auto_submit_on_paid" boolean DEFAULT false,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."categories_faq" ADD CONSTRAINT "categories_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."categories" ADD CONSTRAINT "categories_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_gallery" ADD CONSTRAINT "products_gallery_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_gallery" ADD CONSTRAINT "products_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_stored_gallery" ADD CONSTRAINT "products_stored_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products" ADD CONSTRAINT "products_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."products_rels" ADD CONSTRAINT "products_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."product_variants" ADD CONSTRAINT "product_variants_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payment_methods" ADD CONSTRAINT "payment_methods_icon_id_media_id_fk" FOREIGN KEY ("icon_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."payment_methods" ADD CONSTRAINT "payment_methods_transfer_details_qr_image_id_media_id_fk" FOREIGN KEY ("transfer_details_qr_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."carts_cart_items" ADD CONSTRAINT "carts_cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "payload"."products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."carts_cart_items" ADD CONSTRAINT "carts_cart_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."carts" ADD CONSTRAINT "carts_customer_id_store_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."store_customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders_line_items" ADD CONSTRAINT "orders_line_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders_shipment_events" ADD CONSTRAINT "orders_shipment_events_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_customer_id_store_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "payload"."store_customers"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."orders" ADD CONSTRAINT "orders_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "payload"."carts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."content_pages_blocks_hero" ADD CONSTRAINT "content_pages_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."content_pages_blocks_hero" ADD CONSTRAINT "content_pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."content_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."content_pages_blocks_rich_text" ADD CONSTRAINT "content_pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."content_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."content_pages_blocks_cta" ADD CONSTRAINT "content_pages_blocks_cta_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."content_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."content_pages" ADD CONSTRAINT "content_pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_hero" ADD CONSTRAINT "pages_blocks_hero_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD CONSTRAINT "pages_blocks_featured_collection_collection_id_categories_id_fk" FOREIGN KEY ("collection_id") REFERENCES "payload"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_featured_collection" ADD CONSTRAINT "pages_blocks_featured_collection_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_featured_products" ADD CONSTRAINT "pages_blocks_featured_products_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_rich_text" ADD CONSTRAINT "pages_blocks_rich_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD CONSTRAINT "pages_blocks_image_with_text_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_image_with_text" ADD CONSTRAINT "pages_blocks_image_with_text_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_gallery_images" ADD CONSTRAINT "pages_blocks_gallery_images_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_gallery_images" ADD CONSTRAINT "pages_blocks_gallery_images_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_gallery"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_gallery" ADD CONSTRAINT "pages_blocks_gallery_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ADD CONSTRAINT "pages_blocks_testimonials_entries_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_testimonials_entries" ADD CONSTRAINT "pages_blocks_testimonials_entries_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_testimonials" ADD CONSTRAINT "pages_blocks_testimonials_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ADD CONSTRAINT "pages_blocks_logo_cloud_logos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_logo_cloud_logos" ADD CONSTRAINT "pages_blocks_logo_cloud_logos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_logo_cloud"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_logo_cloud" ADD CONSTRAINT "pages_blocks_logo_cloud_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_newsletter" ADD CONSTRAINT "pages_blocks_newsletter_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_faq_items" ADD CONSTRAINT "pages_blocks_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages_blocks_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_faq" ADD CONSTRAINT "pages_blocks_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_promo_banner" ADD CONSTRAINT "pages_blocks_promo_banner_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD CONSTRAINT "pages_blocks_video_embed_cover_image_id_media_id_fk" FOREIGN KEY ("cover_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_video_embed" ADD CONSTRAINT "pages_blocks_video_embed_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_blocks_divider" ADD CONSTRAINT "pages_blocks_divider_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages" ADD CONSTRAINT "pages_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."pages_rels" ADD CONSTRAINT "pages_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."exports_texts" ADD CONSTRAINT "exports_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."exports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "payload"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "payload"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_products_fk" FOREIGN KEY ("products_id") REFERENCES "payload"."products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_product_variants_fk" FOREIGN KEY ("product_variants_id") REFERENCES "payload"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payment_methods_fk" FOREIGN KEY ("payment_methods_id") REFERENCES "payload"."payment_methods"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_carts_fk" FOREIGN KEY ("carts_id") REFERENCES "payload"."carts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "payload"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_pages_fk" FOREIGN KEY ("content_pages_id") REFERENCES "payload"."content_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_store_customers_fk" FOREIGN KEY ("store_customers_id") REFERENCES "payload"."store_customers"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pages_fk" FOREIGN KEY ("pages_id") REFERENCES "payload"."pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_exports_fk" FOREIGN KEY ("exports_id") REFERENCES "payload"."exports"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "payload"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_header_hidden_defaults" ADD CONSTRAINT "site_header_hidden_defaults_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."site_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_header_tabs_dropdown_items" ADD CONSTRAINT "site_header_tabs_dropdown_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "payload"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_header_tabs_dropdown_items" ADD CONSTRAINT "site_header_tabs_dropdown_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_header_tabs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."site_header_tabs" ADD CONSTRAINT "site_header_tabs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "payload"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."site_header_tabs" ADD CONSTRAINT "site_header_tabs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."site_header"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."store_settings_social_links" ADD CONSTRAINT "store_settings_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."store_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."store_settings" ADD CONSTRAINT "store_settings_logo_id_media_id_fk" FOREIGN KEY ("logo_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."store_settings" ADD CONSTRAINT "store_settings_logo_dark_id_media_id_fk" FOREIGN KEY ("logo_dark_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."store_settings" ADD CONSTRAINT "store_settings_favicon_id_media_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."store_settings" ADD CONSTRAINT "store_settings_hero_image_id_media_id_fk" FOREIGN KEY ("hero_image_id") REFERENCES "payload"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."shipping_settings_zones" ADD CONSTRAINT "shipping_settings_zones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."shipping_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "payload"."users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "payload"."users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "payload"."users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "payload"."users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "payload"."users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "payload"."media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "payload"."media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "payload"."media" USING btree ("filename");
  CREATE INDEX "categories_faq_order_idx" ON "payload"."categories_faq" USING btree ("_order");
  CREATE INDEX "categories_faq_parent_id_idx" ON "payload"."categories_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "payload"."categories" USING btree ("slug");
  CREATE INDEX "categories_meta_meta_image_idx" ON "payload"."categories" USING btree ("meta_image_id");
  CREATE INDEX "categories_updated_at_idx" ON "payload"."categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "payload"."categories" USING btree ("created_at");
  CREATE INDEX "products_gallery_order_idx" ON "payload"."products_gallery" USING btree ("_order");
  CREATE INDEX "products_gallery_parent_id_idx" ON "payload"."products_gallery" USING btree ("_parent_id");
  CREATE INDEX "products_gallery_media_idx" ON "payload"."products_gallery" USING btree ("media_id");
  CREATE INDEX "products_stored_gallery_order_idx" ON "payload"."products_stored_gallery" USING btree ("_order");
  CREATE INDEX "products_stored_gallery_parent_id_idx" ON "payload"."products_stored_gallery" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "products_slug_idx" ON "payload"."products" USING btree ("slug");
  CREATE INDEX "products_image_idx" ON "payload"."products" USING btree ("image_id");
  CREATE INDEX "products_meta_meta_image_idx" ON "payload"."products" USING btree ("meta_image_id");
  CREATE INDEX "products_updated_at_idx" ON "payload"."products" USING btree ("updated_at");
  CREATE INDEX "products_created_at_idx" ON "payload"."products" USING btree ("created_at");
  CREATE INDEX "products_rels_order_idx" ON "payload"."products_rels" USING btree ("order");
  CREATE INDEX "products_rels_parent_idx" ON "payload"."products_rels" USING btree ("parent_id");
  CREATE INDEX "products_rels_path_idx" ON "payload"."products_rels" USING btree ("path");
  CREATE INDEX "products_rels_categories_id_idx" ON "payload"."products_rels" USING btree ("categories_id");
  CREATE INDEX "product_variants_product_idx" ON "payload"."product_variants" USING btree ("product_id");
  CREATE UNIQUE INDEX "product_variants_sku_idx" ON "payload"."product_variants" USING btree ("sku");
  CREATE INDEX "product_variants_image_idx" ON "payload"."product_variants" USING btree ("image_id");
  CREATE INDEX "product_variants_updated_at_idx" ON "payload"."product_variants" USING btree ("updated_at");
  CREATE INDEX "product_variants_created_at_idx" ON "payload"."product_variants" USING btree ("created_at");
  CREATE UNIQUE INDEX "payment_methods_key_idx" ON "payload"."payment_methods" USING btree ("key");
  CREATE INDEX "payment_methods_icon_idx" ON "payload"."payment_methods" USING btree ("icon_id");
  CREATE INDEX "payment_methods_transfer_details_transfer_details_qr_ima_idx" ON "payload"."payment_methods" USING btree ("transfer_details_qr_image_id");
  CREATE INDEX "payment_methods_updated_at_idx" ON "payload"."payment_methods" USING btree ("updated_at");
  CREATE INDEX "payment_methods_created_at_idx" ON "payload"."payment_methods" USING btree ("created_at");
  CREATE INDEX "carts_cart_items_order_idx" ON "payload"."carts_cart_items" USING btree ("_order");
  CREATE INDEX "carts_cart_items_parent_id_idx" ON "payload"."carts_cart_items" USING btree ("_parent_id");
  CREATE INDEX "carts_cart_items_product_idx" ON "payload"."carts_cart_items" USING btree ("product_id");
  CREATE INDEX "carts_session_id_idx" ON "payload"."carts" USING btree ("session_id");
  CREATE INDEX "carts_customer_idx" ON "payload"."carts" USING btree ("customer_id");
  CREATE INDEX "carts_updated_at_idx" ON "payload"."carts" USING btree ("updated_at");
  CREATE INDEX "carts_created_at_idx" ON "payload"."carts" USING btree ("created_at");
  CREATE INDEX "orders_line_items_order_idx" ON "payload"."orders_line_items" USING btree ("_order");
  CREATE INDEX "orders_line_items_parent_id_idx" ON "payload"."orders_line_items" USING btree ("_parent_id");
  CREATE INDEX "orders_shipment_events_order_idx" ON "payload"."orders_shipment_events" USING btree ("_order");
  CREATE INDEX "orders_shipment_events_parent_id_idx" ON "payload"."orders_shipment_events" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "orders_order_id_idx" ON "payload"."orders" USING btree ("order_id");
  CREATE INDEX "orders_customer_idx" ON "payload"."orders" USING btree ("customer_id");
  CREATE INDEX "orders_cart_idx" ON "payload"."orders" USING btree ("cart_id");
  CREATE INDEX "orders_updated_at_idx" ON "payload"."orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "payload"."orders" USING btree ("created_at");
  CREATE INDEX "content_pages_blocks_hero_order_idx" ON "payload"."content_pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "content_pages_blocks_hero_parent_id_idx" ON "payload"."content_pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "content_pages_blocks_hero_path_idx" ON "payload"."content_pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "content_pages_blocks_hero_image_idx" ON "payload"."content_pages_blocks_hero" USING btree ("image_id");
  CREATE INDEX "content_pages_blocks_rich_text_order_idx" ON "payload"."content_pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "content_pages_blocks_rich_text_parent_id_idx" ON "payload"."content_pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "content_pages_blocks_rich_text_path_idx" ON "payload"."content_pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "content_pages_blocks_cta_order_idx" ON "payload"."content_pages_blocks_cta" USING btree ("_order");
  CREATE INDEX "content_pages_blocks_cta_parent_id_idx" ON "payload"."content_pages_blocks_cta" USING btree ("_parent_id");
  CREATE INDEX "content_pages_blocks_cta_path_idx" ON "payload"."content_pages_blocks_cta" USING btree ("_path");
  CREATE UNIQUE INDEX "content_pages_slug_idx" ON "payload"."content_pages" USING btree ("slug");
  CREATE INDEX "content_pages_meta_meta_image_idx" ON "payload"."content_pages" USING btree ("meta_image_id");
  CREATE INDEX "content_pages_updated_at_idx" ON "payload"."content_pages" USING btree ("updated_at");
  CREATE INDEX "content_pages_created_at_idx" ON "payload"."content_pages" USING btree ("created_at");
  CREATE UNIQUE INDEX "store_customers_email_idx" ON "payload"."store_customers" USING btree ("email");
  CREATE INDEX "store_customers_prisma_user_id_idx" ON "payload"."store_customers" USING btree ("prisma_user_id");
  CREATE INDEX "store_customers_updated_at_idx" ON "payload"."store_customers" USING btree ("updated_at");
  CREATE INDEX "store_customers_created_at_idx" ON "payload"."store_customers" USING btree ("created_at");
  CREATE INDEX "pages_blocks_hero_order_idx" ON "payload"."pages_blocks_hero" USING btree ("_order");
  CREATE INDEX "pages_blocks_hero_parent_id_idx" ON "payload"."pages_blocks_hero" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_hero_path_idx" ON "payload"."pages_blocks_hero" USING btree ("_path");
  CREATE INDEX "pages_blocks_hero_image_idx" ON "payload"."pages_blocks_hero" USING btree ("image_id");
  CREATE INDEX "pages_blocks_featured_collection_order_idx" ON "payload"."pages_blocks_featured_collection" USING btree ("_order");
  CREATE INDEX "pages_blocks_featured_collection_parent_id_idx" ON "payload"."pages_blocks_featured_collection" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_featured_collection_path_idx" ON "payload"."pages_blocks_featured_collection" USING btree ("_path");
  CREATE INDEX "pages_blocks_featured_collection_collection_idx" ON "payload"."pages_blocks_featured_collection" USING btree ("collection_id");
  CREATE INDEX "pages_blocks_featured_products_order_idx" ON "payload"."pages_blocks_featured_products" USING btree ("_order");
  CREATE INDEX "pages_blocks_featured_products_parent_id_idx" ON "payload"."pages_blocks_featured_products" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_featured_products_path_idx" ON "payload"."pages_blocks_featured_products" USING btree ("_path");
  CREATE INDEX "pages_blocks_rich_text_order_idx" ON "payload"."pages_blocks_rich_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_rich_text_parent_id_idx" ON "payload"."pages_blocks_rich_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_rich_text_path_idx" ON "payload"."pages_blocks_rich_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_with_text_order_idx" ON "payload"."pages_blocks_image_with_text" USING btree ("_order");
  CREATE INDEX "pages_blocks_image_with_text_parent_id_idx" ON "payload"."pages_blocks_image_with_text" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_image_with_text_path_idx" ON "payload"."pages_blocks_image_with_text" USING btree ("_path");
  CREATE INDEX "pages_blocks_image_with_text_image_idx" ON "payload"."pages_blocks_image_with_text" USING btree ("image_id");
  CREATE INDEX "pages_blocks_gallery_images_order_idx" ON "payload"."pages_blocks_gallery_images" USING btree ("_order");
  CREATE INDEX "pages_blocks_gallery_images_parent_id_idx" ON "payload"."pages_blocks_gallery_images" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_gallery_images_image_idx" ON "payload"."pages_blocks_gallery_images" USING btree ("image_id");
  CREATE INDEX "pages_blocks_gallery_order_idx" ON "payload"."pages_blocks_gallery" USING btree ("_order");
  CREATE INDEX "pages_blocks_gallery_parent_id_idx" ON "payload"."pages_blocks_gallery" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_gallery_path_idx" ON "payload"."pages_blocks_gallery" USING btree ("_path");
  CREATE INDEX "pages_blocks_testimonials_entries_order_idx" ON "payload"."pages_blocks_testimonials_entries" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_entries_parent_id_idx" ON "payload"."pages_blocks_testimonials_entries" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_entries_avatar_idx" ON "payload"."pages_blocks_testimonials_entries" USING btree ("avatar_id");
  CREATE INDEX "pages_blocks_testimonials_order_idx" ON "payload"."pages_blocks_testimonials" USING btree ("_order");
  CREATE INDEX "pages_blocks_testimonials_parent_id_idx" ON "payload"."pages_blocks_testimonials" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_testimonials_path_idx" ON "payload"."pages_blocks_testimonials" USING btree ("_path");
  CREATE INDEX "pages_blocks_logo_cloud_logos_order_idx" ON "payload"."pages_blocks_logo_cloud_logos" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_logos_parent_id_idx" ON "payload"."pages_blocks_logo_cloud_logos" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_logos_image_idx" ON "payload"."pages_blocks_logo_cloud_logos" USING btree ("image_id");
  CREATE INDEX "pages_blocks_logo_cloud_order_idx" ON "payload"."pages_blocks_logo_cloud" USING btree ("_order");
  CREATE INDEX "pages_blocks_logo_cloud_parent_id_idx" ON "payload"."pages_blocks_logo_cloud" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_logo_cloud_path_idx" ON "payload"."pages_blocks_logo_cloud" USING btree ("_path");
  CREATE INDEX "pages_blocks_newsletter_order_idx" ON "payload"."pages_blocks_newsletter" USING btree ("_order");
  CREATE INDEX "pages_blocks_newsletter_parent_id_idx" ON "payload"."pages_blocks_newsletter" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_newsletter_path_idx" ON "payload"."pages_blocks_newsletter" USING btree ("_path");
  CREATE INDEX "pages_blocks_faq_items_order_idx" ON "payload"."pages_blocks_faq_items" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_items_parent_id_idx" ON "payload"."pages_blocks_faq_items" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_order_idx" ON "payload"."pages_blocks_faq" USING btree ("_order");
  CREATE INDEX "pages_blocks_faq_parent_id_idx" ON "payload"."pages_blocks_faq" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_faq_path_idx" ON "payload"."pages_blocks_faq" USING btree ("_path");
  CREATE INDEX "pages_blocks_promo_banner_order_idx" ON "payload"."pages_blocks_promo_banner" USING btree ("_order");
  CREATE INDEX "pages_blocks_promo_banner_parent_id_idx" ON "payload"."pages_blocks_promo_banner" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_promo_banner_path_idx" ON "payload"."pages_blocks_promo_banner" USING btree ("_path");
  CREATE INDEX "pages_blocks_video_embed_order_idx" ON "payload"."pages_blocks_video_embed" USING btree ("_order");
  CREATE INDEX "pages_blocks_video_embed_parent_id_idx" ON "payload"."pages_blocks_video_embed" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_video_embed_path_idx" ON "payload"."pages_blocks_video_embed" USING btree ("_path");
  CREATE INDEX "pages_blocks_video_embed_cover_image_idx" ON "payload"."pages_blocks_video_embed" USING btree ("cover_image_id");
  CREATE INDEX "pages_blocks_divider_order_idx" ON "payload"."pages_blocks_divider" USING btree ("_order");
  CREATE INDEX "pages_blocks_divider_parent_id_idx" ON "payload"."pages_blocks_divider" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_divider_path_idx" ON "payload"."pages_blocks_divider" USING btree ("_path");
  CREATE UNIQUE INDEX "pages_slug_idx" ON "payload"."pages" USING btree ("slug");
  CREATE INDEX "pages_meta_meta_image_idx" ON "payload"."pages" USING btree ("meta_image_id");
  CREATE INDEX "pages_updated_at_idx" ON "payload"."pages" USING btree ("updated_at");
  CREATE INDEX "pages_created_at_idx" ON "payload"."pages" USING btree ("created_at");
  CREATE INDEX "pages_rels_order_idx" ON "payload"."pages_rels" USING btree ("order");
  CREATE INDEX "pages_rels_parent_idx" ON "payload"."pages_rels" USING btree ("parent_id");
  CREATE INDEX "pages_rels_path_idx" ON "payload"."pages_rels" USING btree ("path");
  CREATE INDEX "pages_rels_products_id_idx" ON "payload"."pages_rels" USING btree ("products_id");
  CREATE INDEX "exports_updated_at_idx" ON "payload"."exports" USING btree ("updated_at");
  CREATE INDEX "exports_created_at_idx" ON "payload"."exports" USING btree ("created_at");
  CREATE UNIQUE INDEX "exports_filename_idx" ON "payload"."exports" USING btree ("filename");
  CREATE INDEX "exports_texts_order_parent" ON "payload"."exports_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload"."payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload"."payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload"."payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload"."payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload"."payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload"."payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload"."payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload"."payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload"."payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload"."payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload"."payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_products_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("products_id");
  CREATE INDEX "payload_locked_documents_rels_product_variants_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("product_variants_id");
  CREATE INDEX "payload_locked_documents_rels_payment_methods_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("payment_methods_id");
  CREATE INDEX "payload_locked_documents_rels_carts_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("carts_id");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("orders_id");
  CREATE INDEX "payload_locked_documents_rels_content_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("content_pages_id");
  CREATE INDEX "payload_locked_documents_rels_store_customers_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("store_customers_id");
  CREATE INDEX "payload_locked_documents_rels_pages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("pages_id");
  CREATE INDEX "payload_locked_documents_rels_exports_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("exports_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload"."payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");
  CREATE INDEX "site_header_hidden_defaults_order_idx" ON "payload"."site_header_hidden_defaults" USING btree ("order");
  CREATE INDEX "site_header_hidden_defaults_parent_idx" ON "payload"."site_header_hidden_defaults" USING btree ("parent_id");
  CREATE INDEX "site_header_tabs_dropdown_items_order_idx" ON "payload"."site_header_tabs_dropdown_items" USING btree ("_order");
  CREATE INDEX "site_header_tabs_dropdown_items_parent_id_idx" ON "payload"."site_header_tabs_dropdown_items" USING btree ("_parent_id");
  CREATE INDEX "site_header_tabs_dropdown_items_category_idx" ON "payload"."site_header_tabs_dropdown_items" USING btree ("category_id");
  CREATE INDEX "site_header_tabs_order_idx" ON "payload"."site_header_tabs" USING btree ("_order");
  CREATE INDEX "site_header_tabs_parent_id_idx" ON "payload"."site_header_tabs" USING btree ("_parent_id");
  CREATE INDEX "site_header_tabs_category_idx" ON "payload"."site_header_tabs" USING btree ("category_id");
  CREATE INDEX "store_settings_social_links_order_idx" ON "payload"."store_settings_social_links" USING btree ("_order");
  CREATE INDEX "store_settings_social_links_parent_id_idx" ON "payload"."store_settings_social_links" USING btree ("_parent_id");
  CREATE INDEX "store_settings_logo_idx" ON "payload"."store_settings" USING btree ("logo_id");
  CREATE INDEX "store_settings_logo_dark_idx" ON "payload"."store_settings" USING btree ("logo_dark_id");
  CREATE INDEX "store_settings_favicon_idx" ON "payload"."store_settings" USING btree ("favicon_id");
  CREATE INDEX "store_settings_hero_image_idx" ON "payload"."store_settings" USING btree ("hero_image_id");
  CREATE INDEX "shipping_settings_zones_order_idx" ON "payload"."shipping_settings_zones" USING btree ("_order");
  CREATE INDEX "shipping_settings_zones_parent_id_idx" ON "payload"."shipping_settings_zones" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."users_sessions" CASCADE;
  DROP TABLE "payload"."users" CASCADE;
  DROP TABLE "payload"."media" CASCADE;
  DROP TABLE "payload"."categories_faq" CASCADE;
  DROP TABLE "payload"."categories" CASCADE;
  DROP TABLE "payload"."products_gallery" CASCADE;
  DROP TABLE "payload"."products_stored_gallery" CASCADE;
  DROP TABLE "payload"."products" CASCADE;
  DROP TABLE "payload"."products_rels" CASCADE;
  DROP TABLE "payload"."product_variants" CASCADE;
  DROP TABLE "payload"."payment_methods" CASCADE;
  DROP TABLE "payload"."carts_cart_items" CASCADE;
  DROP TABLE "payload"."carts" CASCADE;
  DROP TABLE "payload"."orders_line_items" CASCADE;
  DROP TABLE "payload"."orders_shipment_events" CASCADE;
  DROP TABLE "payload"."orders" CASCADE;
  DROP TABLE "payload"."content_pages_blocks_hero" CASCADE;
  DROP TABLE "payload"."content_pages_blocks_rich_text" CASCADE;
  DROP TABLE "payload"."content_pages_blocks_cta" CASCADE;
  DROP TABLE "payload"."content_pages" CASCADE;
  DROP TABLE "payload"."store_customers" CASCADE;
  DROP TABLE "payload"."pages_blocks_hero" CASCADE;
  DROP TABLE "payload"."pages_blocks_featured_collection" CASCADE;
  DROP TABLE "payload"."pages_blocks_featured_products" CASCADE;
  DROP TABLE "payload"."pages_blocks_rich_text" CASCADE;
  DROP TABLE "payload"."pages_blocks_image_with_text" CASCADE;
  DROP TABLE "payload"."pages_blocks_gallery_images" CASCADE;
  DROP TABLE "payload"."pages_blocks_gallery" CASCADE;
  DROP TABLE "payload"."pages_blocks_testimonials_entries" CASCADE;
  DROP TABLE "payload"."pages_blocks_testimonials" CASCADE;
  DROP TABLE "payload"."pages_blocks_logo_cloud_logos" CASCADE;
  DROP TABLE "payload"."pages_blocks_logo_cloud" CASCADE;
  DROP TABLE "payload"."pages_blocks_newsletter" CASCADE;
  DROP TABLE "payload"."pages_blocks_faq_items" CASCADE;
  DROP TABLE "payload"."pages_blocks_faq" CASCADE;
  DROP TABLE "payload"."pages_blocks_promo_banner" CASCADE;
  DROP TABLE "payload"."pages_blocks_video_embed" CASCADE;
  DROP TABLE "payload"."pages_blocks_divider" CASCADE;
  DROP TABLE "payload"."pages" CASCADE;
  DROP TABLE "payload"."pages_rels" CASCADE;
  DROP TABLE "payload"."exports" CASCADE;
  DROP TABLE "payload"."exports_texts" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_jobs_log" CASCADE;
  DROP TABLE "payload"."payload_jobs" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;
  DROP TABLE "payload"."site_header_hidden_defaults" CASCADE;
  DROP TABLE "payload"."site_header_tabs_dropdown_items" CASCADE;
  DROP TABLE "payload"."site_header_tabs" CASCADE;
  DROP TABLE "payload"."site_header" CASCADE;
  DROP TABLE "payload"."store_settings_social_links" CASCADE;
  DROP TABLE "payload"."store_settings" CASCADE;
  DROP TABLE "payload"."shipping_settings_zones" CASCADE;
  DROP TABLE "payload"."shipping_settings" CASCADE;
  DROP TABLE "payload"."dropship_settings" CASCADE;
  DROP TYPE "payload"."enum_products_stored_gallery_kind";
  DROP TYPE "payload"."enum_products_stored_image_kind";
  DROP TYPE "payload"."enum_payment_methods_kind";
  DROP TYPE "payload"."enum_payment_methods_provider";
  DROP TYPE "payload"."enum_orders_shipment_events_status";
  DROP TYPE "payload"."enum_orders_payment_status";
  DROP TYPE "payload"."enum_orders_order_status";
  DROP TYPE "payload"."enum_orders_delivery_method";
  DROP TYPE "payload"."enum_orders_shipping_carrier_key";
  DROP TYPE "payload"."enum_orders_shipment_status";
  DROP TYPE "payload"."enum_pages_blocks_hero_cta_style";
  DROP TYPE "payload"."enum_pages_blocks_hero_image_position";
  DROP TYPE "payload"."enum_pages_blocks_hero_text_align";
  DROP TYPE "payload"."enum_pages_blocks_hero_background";
  DROP TYPE "payload"."enum_pages_blocks_hero_container_width";
  DROP TYPE "payload"."enum_pages_blocks_hero_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_layout";
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_background";
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_container_width";
  DROP TYPE "payload"."enum_pages_blocks_featured_collection_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_featured_products_layout";
  DROP TYPE "payload"."enum_pages_blocks_featured_products_background";
  DROP TYPE "payload"."enum_pages_blocks_featured_products_container_width";
  DROP TYPE "payload"."enum_pages_blocks_featured_products_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_rich_text_text_align";
  DROP TYPE "payload"."enum_pages_blocks_rich_text_background";
  DROP TYPE "payload"."enum_pages_blocks_rich_text_container_width";
  DROP TYPE "payload"."enum_pages_blocks_rich_text_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_image_position";
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_image_ratio";
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_background";
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_container_width";
  DROP TYPE "payload"."enum_pages_blocks_image_with_text_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_gallery_layout";
  DROP TYPE "payload"."enum_pages_blocks_gallery_background";
  DROP TYPE "payload"."enum_pages_blocks_gallery_container_width";
  DROP TYPE "payload"."enum_pages_blocks_gallery_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_testimonials_layout";
  DROP TYPE "payload"."enum_pages_blocks_testimonials_background";
  DROP TYPE "payload"."enum_pages_blocks_testimonials_container_width";
  DROP TYPE "payload"."enum_pages_blocks_testimonials_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_logo_cloud_background";
  DROP TYPE "payload"."enum_pages_blocks_logo_cloud_container_width";
  DROP TYPE "payload"."enum_pages_blocks_logo_cloud_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_newsletter_background";
  DROP TYPE "payload"."enum_pages_blocks_newsletter_container_width";
  DROP TYPE "payload"."enum_pages_blocks_newsletter_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_faq_layout";
  DROP TYPE "payload"."enum_pages_blocks_faq_background";
  DROP TYPE "payload"."enum_pages_blocks_faq_container_width";
  DROP TYPE "payload"."enum_pages_blocks_faq_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_promo_banner_background";
  DROP TYPE "payload"."enum_pages_blocks_promo_banner_container_width";
  DROP TYPE "payload"."enum_pages_blocks_promo_banner_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_video_embed_aspect_ratio";
  DROP TYPE "payload"."enum_pages_blocks_video_embed_background";
  DROP TYPE "payload"."enum_pages_blocks_video_embed_container_width";
  DROP TYPE "payload"."enum_pages_blocks_video_embed_padding_y";
  DROP TYPE "payload"."enum_pages_blocks_divider_style";
  DROP TYPE "payload"."enum_pages_blocks_divider_background";
  DROP TYPE "payload"."enum_pages_blocks_divider_container_width";
  DROP TYPE "payload"."enum_pages_blocks_divider_padding_y";
  DROP TYPE "payload"."enum_pages_status";
  DROP TYPE "payload"."enum_exports_format";
  DROP TYPE "payload"."enum_exports_drafts";
  DROP TYPE "payload"."enum_payload_jobs_log_task_slug";
  DROP TYPE "payload"."enum_payload_jobs_log_state";
  DROP TYPE "payload"."enum_payload_jobs_task_slug";
  DROP TYPE "payload"."enum_site_header_hidden_defaults";
  DROP TYPE "payload"."enum_site_header_tabs_kind";
  DROP TYPE "payload"."enum_store_settings_font_preset";
  DROP TYPE "payload"."enum_dropship_settings_provider";`)
}
