import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."notification_settings" ADD COLUMN "discord_enabled" boolean DEFAULT false;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "discord_bot_token" varchar;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "discord_channel_id" varchar;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "discord_public_key" varchar;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "discord_allowed_user_ids" varchar;
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "zalo_enabled";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "zalo_app_id";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "zalo_app_secret";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "zalo_recipient_user_id";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "zalo_refresh_token";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "zalo_access_token";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "zalo_token_expires_at";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."notification_settings" ADD COLUMN "zalo_enabled" boolean DEFAULT false;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "zalo_app_id" varchar;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "zalo_app_secret" varchar;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "zalo_recipient_user_id" varchar;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "zalo_refresh_token" varchar;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "zalo_access_token" varchar;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "zalo_token_expires_at" timestamp(3) with time zone;
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "discord_enabled";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "discord_bot_token";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "discord_channel_id";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "discord_public_key";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "discord_allowed_user_ids";`)
}
