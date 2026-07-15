#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] starting — running database migrations"

# 1. Prisma migrations (coupons / gift cards / campaigns).
#    Binaries are called directly: project `pnpm <script>` hits a deps precheck.
echo "[entrypoint] prisma migrate deploy"
node_modules/.bin/prisma migrate deploy

# 2. Payload migrations (Payload-managed collections/tables).
#    Use migrations, not `schema push`: push ignores migration files and silently
#    skips destructive diffs (e.g. dropped columns) in a non-interactive container,
#    leaving the DB out of sync with the compiled server.
echo "[entrypoint] payload migrate"
# `payload migrate` asks an interactive y/N question before applying, and in a
# non-interactive container an unanswered prompt blocks forever on stdin. The
# answer MUST be "y": declining makes Payload call process.exit(0) and skip every
# pending migration while still exiting 0, so the boot continues against a schema
# that was never created. The failure then surfaces far away, at runtime, as
# Postgres 42P01 "relation does not exist" on the first query touching a missing
# table — not at boot, where it belongs.
#
# Trade-off: on a DB carrying a `batch = -1` marker (left by a previous
# `migrate:dev` / schema push), "y" accepts a reconcile that Payload warns may
# lose data. That is the correct default for this image, which only ever runs
# against deploy databases — a silently unmigrated schema is the worse failure.
# Take a dump before deploying onto a DB that holds data you cannot lose.
yes | node_modules/.bin/payload migrate

# Fail loudly if the schema still is not there. Without this the container serves
# 500s that look like an application bug rather than a failed migration.
if ! node_modules/.bin/tsx scripts/db-schema-ready.ts; then
  echo "[entrypoint] FATAL: payload migrations did not apply — refusing to start" >&2
  exit 1
fi

# 2.5 First-boot store seed (opt-in via SEED_ON_BOOT=true).
#     For a fresh deploy on someone else's machine, the named DB volume starts
#     empty — migrations create the schema but there is no catalog/content. This
#     populates a complete store ONCE: the guard only proceeds when the products
#     table is empty, so restarts and an already-seeded DB are never touched.
#     Seed failures are logged but MUST NOT abort startup (`set +e`): a partial
#     or failed seed should still let the server come up rather than crash-loop.
#     The catalog seed downloads product images from the Shopee CDN, so first
#     boot can take a few minutes.
if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  if node_modules/.bin/tsx scripts/db-needs-seed.ts; then
    echo "[entrypoint] empty store detected — seeding (first boot, may take minutes)"
    set +e
    node_modules/.bin/tsx scripts/seed-payload-admin.ts
    node_modules/.bin/tsx scripts/seed-store-settings.ts
    node_modules/.bin/tsx scripts/seed-site-header.ts
    node_modules/.bin/tsx scripts/seed-payment-methods.ts
    node_modules/.bin/tsx scripts/seed-payload-categories.ts
    node_modules/.bin/tsx scripts/seed-shopee-catalog.ts
    node_modules/.bin/tsx scripts/import-shopee-prices.ts --apply
    node_modules/.bin/tsx scripts/seed-home-page.ts
    node_modules/.bin/tsx scripts/seed-theme-preset.ts
    set -e
    echo "[entrypoint] seed step finished"
  else
    echo "[entrypoint] store already populated (or guard skipped) — not seeding"
  fi
fi

# 3. Hand off to the Next.js server (PID 1 so signals propagate).
echo "[entrypoint] starting next server on :${PORT:-3000}"
exec node_modules/.bin/next start -p "${PORT:-3000}"
