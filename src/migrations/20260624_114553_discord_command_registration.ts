import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."notification_settings" ADD COLUMN "discord_application_id" varchar;
  ALTER TABLE "payload"."notification_settings" ADD COLUMN "discord_guild_id" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."notification_settings" DROP COLUMN "discord_application_id";
  ALTER TABLE "payload"."notification_settings" DROP COLUMN "discord_guild_id";`)
}
