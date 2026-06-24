import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "payload"."enum_orders_cancellation_reason" AS ENUM('changed_mind', 'ordered_by_mistake', 'found_better_price', 'delivery_too_slow', 'other');
  ALTER TABLE "payload"."orders" ADD COLUMN "cancellation_reason" "payload"."enum_orders_cancellation_reason";
  ALTER TABLE "payload"."orders" ADD COLUMN "cancellation_note" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."orders" DROP COLUMN "cancellation_reason";
  ALTER TABLE "payload"."orders" DROP COLUMN "cancellation_note";
  DROP TYPE "payload"."enum_orders_cancellation_reason";`)
}
