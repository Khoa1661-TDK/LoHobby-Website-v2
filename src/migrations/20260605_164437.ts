import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."notification_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"zalo_enabled" boolean DEFAULT false,
  	"zalo_app_id" varchar,
  	"zalo_app_secret" varchar,
  	"zalo_recipient_user_id" varchar,
  	"zalo_refresh_token" varchar,
  	"zalo_access_token" varchar,
  	"zalo_token_expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."store_settings" ADD COLUMN "chat_enabled" boolean DEFAULT false;
  ALTER TABLE "payload"."store_settings" ADD COLUMN "zalo_chat_enabled" boolean DEFAULT false;
  ALTER TABLE "payload"."store_settings" ADD COLUMN "zalo_oa_id" varchar;
  ALTER TABLE "payload"."store_settings" ADD COLUMN "zalo_welcome_message" varchar;
  ALTER TABLE "payload"."store_settings" ADD COLUMN "messenger_chat_enabled" boolean DEFAULT false;
  ALTER TABLE "payload"."store_settings" ADD COLUMN "fb_page_id" varchar;
  ALTER TABLE "payload"."store_settings" ADD COLUMN "messenger_theme_color" varchar;
  ALTER TABLE "payload"."store_settings" ADD COLUMN "messenger_greeting" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."notification_settings" CASCADE;
  ALTER TABLE "payload"."store_settings" DROP COLUMN "chat_enabled";
  ALTER TABLE "payload"."store_settings" DROP COLUMN "zalo_chat_enabled";
  ALTER TABLE "payload"."store_settings" DROP COLUMN "zalo_oa_id";
  ALTER TABLE "payload"."store_settings" DROP COLUMN "zalo_welcome_message";
  ALTER TABLE "payload"."store_settings" DROP COLUMN "messenger_chat_enabled";
  ALTER TABLE "payload"."store_settings" DROP COLUMN "fb_page_id";
  ALTER TABLE "payload"."store_settings" DROP COLUMN "messenger_theme_color";
  ALTER TABLE "payload"."store_settings" DROP COLUMN "messenger_greeting";`)
}
