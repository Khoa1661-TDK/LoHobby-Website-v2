import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Enables Payload's jobs system for the `autoSale` scheduled task (Task 6).
//
// NOT hand-trimmed — kept verbatim from `payload migrate:create`; the
// generated diff was already small and entirely on-topic. `payload_jobs` /
// `payload_jobs_log` already existed (created in 20260602_102342, since
// @shopnex/import-export-plugin registers its own `createCollectionExport`
// job task independently of this feature), so enabling `jobs.tasks` here only
// needed to: ADD VALUE 'autoSale' to the `enum_payload_jobs_task_slug` /
// `enum_payload_jobs_log_task_slug` enums, create the `payload_jobs_stats`
// global table, and add the `meta` jsonb column payload's newer scheduling
// code writes to on `payload_jobs`. Verified against the live DB before
// accepting: `payload_jobs_stats` absent, enum only had
// `inline`/`createCollectionExport`, `payload_jobs.meta` absent.
//
// First attempt at this migration (discarded, never shipped) DROPPED
// `createCollectionExport` from both enums instead of ADDing `autoSale`
// alongside it. Root cause: @shopnex/import-export-plugin only registers its
// task via `config.jobs = config.jobs || { tasks: [...] }` — i.e. only when
// `config.jobs` is still unset at the point the plugin runs. Declaring
// `jobs: {...}` directly on the object passed to `buildConfig` in
// payload.config.ts makes `config.jobs` truthy before any plugin runs, so
// that assignment silently no-ops and the plugin's task registration is lost
// (confirmed no rows existed yet with that task_slug, so the mistake never
// touched real data, but the enum recreation would have broken the plugin's
// export job if it were ever run with `disableJobsQueue: false`). Fixed by
// moving the `jobs` block into a small local plugin (`autoSaleJobsPlugin` in
// src/payload/plugins.ts) appended after `importExportPlugin`, which merges
// onto `config.jobs.tasks` instead of overwriting it. No `payload_jobs_id`
// column is added to `payload_locked_documents_rels`: the jobs collection was
// already established without document locking wired to it, so that part of
// the task brief (written for a fresh install) doesn't apply here.

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "payload"."enum_payload_jobs_log_task_slug" ADD VALUE 'autoSale';
  ALTER TYPE "payload"."enum_payload_jobs_task_slug" ADD VALUE 'autoSale';
  CREATE TABLE "payload"."payload_jobs_stats" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"stats" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload"."payload_jobs" ADD COLUMN "meta" jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."payload_jobs_stats" CASCADE;
  ALTER TABLE "payload"."payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "payload"."enum_payload_jobs_log_task_slug";
  CREATE TYPE "payload"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'createCollectionExport');
  ALTER TABLE "payload"."payload_jobs_log" ALTER COLUMN "task_slug" SET DATA TYPE "payload"."enum_payload_jobs_log_task_slug" USING "task_slug"::"payload"."enum_payload_jobs_log_task_slug";
  ALTER TABLE "payload"."payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE text;
  DROP TYPE "payload"."enum_payload_jobs_task_slug";
  CREATE TYPE "payload"."enum_payload_jobs_task_slug" AS ENUM('inline', 'createCollectionExport');
  ALTER TABLE "payload"."payload_jobs" ALTER COLUMN "task_slug" SET DATA TYPE "payload"."enum_payload_jobs_task_slug" USING "task_slug"::"payload"."enum_payload_jobs_task_slug";
  ALTER TABLE "payload"."payload_jobs" DROP COLUMN "meta";`)
}
