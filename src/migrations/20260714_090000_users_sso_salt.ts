import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Security fix: `derivePayloadPassword` (lib/payload-admin-sync.ts) was a
// deterministic HMAC of (PAYLOAD_SECRET/AUTH_SECRET, email) alone — a leaked
// secret made every admin's Payload password trivially computable from their
// email. This adds a per-user random salt mixed into that derivation, so the
// env secret alone is no longer sufficient; the attacker would also need
// each user's stored salt, which lives only in this column. Nullable because
// existing rows predate this field — `ensurePayloadAdminUser` backfills it
// lazily on next sync.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."users" ADD COLUMN "sso_salt" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."users" DROP COLUMN "sso_salt";`)
}
