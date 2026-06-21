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
node_modules/.bin/payload migrate

# 3. Hand off to the Next.js server (PID 1 so signals propagate).
echo "[entrypoint] starting next server on :${PORT:-3000}"
exec node_modules/.bin/next start -p "${PORT:-3000}"
