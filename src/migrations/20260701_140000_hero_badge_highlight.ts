import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "headline_highlight" varchar;
  ALTER TABLE "payload"."pages_blocks_hero" ADD COLUMN "media_badge" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "headline_highlight";
  ALTER TABLE "payload"."pages_blocks_hero" DROP COLUMN "media_badge";`)
}
