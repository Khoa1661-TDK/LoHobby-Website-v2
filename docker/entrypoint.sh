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

# 3. Hand off to the Next.js server (PID 1 so signals propagate).
echo "[entrypoint] starting next server on :${PORT:-3000}"
exec node_modules/.bin/next start -p "${PORT:-3000}"
