#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] starting — running database migrations"

# 1. Prisma migrations (coupons / gift cards / campaigns).
#    Binaries are called directly: project `pnpm <script>` hits a deps precheck.
echo "[entrypoint] prisma migrate deploy"
node_modules/.bin/prisma migrate deploy

# 2. Payload schema sync (Payload-managed collections/tables).
echo "[entrypoint] payload schema push"
node_modules/.bin/tsx scripts/payload-db-push.ts

# 3. Hand off to the Next.js server (PID 1 so signals propagate).
echo "[entrypoint] starting next server on :${PORT:-3000}"
exec node_modules/.bin/next start -p "${PORT:-3000}"
