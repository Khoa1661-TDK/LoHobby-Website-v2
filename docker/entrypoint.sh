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
# A DB previously pushed via `payload migrate:dev` carries a `batch = -1` marker
# in the payload-migrations table. On `payload migrate`, Payload stops and asks
# interactively whether to reconcile (possible data loss). In a non-interactive
# container the prompt blocks forever on stdin, so `next start` never runs and
# the app serves empty responses. Auto-answer "no": Payload calls process.exit(0)
# and skips — safe here because migrate:status confirms every migration file is
# already applied, so there is nothing to reconcile. If a real pending migration
# is added later, remove this marker row or run migrate:dev locally first.
printf 'n\n' | node_modules/.bin/payload migrate

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
