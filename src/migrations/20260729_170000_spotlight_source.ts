import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Adds the Spotlight block's manual/automatic `source` selector. Written by hand
// rather than generated: `payload migrate:create` prompts per enum and bundles
// unrelated destructive statements caused by pre-existing dev-database drift, and
// this change is one enum plus one column. See 20260729_090000_auto_sale_released_at.ts.
//
// The backfill to 'manual' is required, not cosmetic. Payload's `defaultValue` only
// applies to newly created blocks, so existing rows would stay NULL — and the block's
// `deals` array is gated on `source === 'manual'`, so those rows would lose their
// editor until someone re-picked the mode. The equality form of that condition is
// itself required by the visual builder's condition probe; see the comment on the
// field in src/payload/blocks/Spotlight.ts.

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   DO $$ BEGIN
    CREATE TYPE "payload"."enum_pages_blocks_spotlight_source" AS ENUM('manual', 'auto');
   EXCEPTION WHEN duplicate_object THEN null; END $$;

   ALTER TABLE "payload"."pages_blocks_spotlight"
    ADD COLUMN IF NOT EXISTS "source" "payload"."enum_pages_blocks_spotlight_source" DEFAULT 'manual';

   UPDATE "payload"."pages_blocks_spotlight" SET "source" = 'manual' WHERE "source" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."pages_blocks_spotlight" DROP COLUMN IF EXISTS "source";
   DROP TYPE IF EXISTS "payload"."enum_pages_blocks_spotlight_source";
  `)
}
