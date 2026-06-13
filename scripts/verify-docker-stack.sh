#!/usr/bin/env bash
# verify-docker-stack.sh — one-shot smoke test for the Docker Compose stack.
#
# Runs plan Task 10's acceptance checks against a throwaway instance:
#   1. stack builds and comes up; app reaches "healthy"
#   2. GET /health returns status:ok through the app container
#   3. postgres is NOT published to the host
#   4. uploaded media survives a `down` / `up` cycle
#
# It uses generated throwaway credentials and a temporary compose override so
# it NEVER reads or modifies your real .env, and tears everything down (volumes
# included) at the end. Requires Docker daemon access — run with sudo:
#
#   sudo bash scripts/verify-docker-stack.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

ENV_VERIFY="$ROOT/.env.verify.local"        # gitignored via .env.*.local
OVERRIDE="$ROOT/docker-compose.verify.yml"  # generated, removed on exit
PROJECT="shopnexverify"                      # isolated compose project name

DC=(docker compose -p "$PROJECT" --env-file "$ENV_VERIFY" \
    -f docker-compose.yml -f "$OVERRIDE")

PASS=0
FAIL=0
note()  { printf '\n\033[1m== %s ==\033[0m\n' "$*"; }
ok()    { printf '  \033[32mPASS\033[0m %s\n' "$*"; PASS=$((PASS+1)); }
bad()   { printf '  \033[31mFAIL\033[0m %s\n' "$*"; FAIL=$((FAIL+1)); }

cleanup() {
  note "Tearing down (removing throwaway volumes)"
  "${DC[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -f "$ENV_VERIFY" "$OVERRIDE"
}
trap cleanup EXIT

# --- generate throwaway env + override -------------------------------------
note "Generating throwaway credentials"
PGPASS="$(openssl rand -hex 16)"
SECRET="$(openssl rand -hex 32)"
cat > "$ENV_VERIFY" <<EOF
POSTGRES_USER=shopnex
POSTGRES_PASSWORD=${PGPASS}
POSTGRES_DB=shopnex
DATABASE_URL=postgresql://shopnex:${PGPASS}@postgres:5432/shopnex?schema=public
PAYLOAD_SECRET=${SECRET}
AUTH_SECRET=${SECRET}
AUTH_URL=http://localhost
NEXT_PUBLIC_APP_URL=http://localhost
NEXT_PUBLIC_SITE_URL=http://localhost
NEXT_PUBLIC_SITE_NAME=Verify
PAYMENT_SECRETS_KEY=${SECRET}
PREVIEW_SECRET=${SECRET}
ADMIN_EMAILS=verify@example.com
DOMAIN=localhost
EOF

# Override appends the throwaway env file (last wins) so the real .env's
# critical vars are overridden without editing it, and pins DOMAIN for Caddy.
cat > "$OVERRIDE" <<EOF
services:
  postgres:
    env_file:
      - ${ENV_VERIFY}
  app:
    env_file:
      - ${ENV_VERIFY}
  caddy:
    env_file:
      - ${ENV_VERIFY}
EOF

# --- build + up -------------------------------------------------------------
note "Building images (this can take several minutes)"
if "${DC[@]}" build; then ok "image build succeeded"; else bad "image build failed"; exit 1; fi

note "Starting the stack"
"${DC[@]}" up -d

# --- wait for app health ----------------------------------------------------
note "Waiting for the app container to become healthy (up to 5 min)"
APP_CID="$("${DC[@]}" ps -q app)"
healthy=false
for _ in $(seq 1 60); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$APP_CID" 2>/dev/null || echo starting)"
  if [ "$status" = "healthy" ]; then healthy=true; break; fi
  if [ "$status" = "unhealthy" ]; then break; fi
  sleep 5
done
if $healthy; then ok "app reached healthy"; else
  bad "app did not become healthy (last status: ${status:-unknown})"
  note "app logs (tail)"; "${DC[@]}" logs --tail 40 app || true
fi

# --- check 1: /health through the app --------------------------------------
note "Check: GET /health inside the app container"
if "${DC[@]}" exec -T app wget -qO- http://localhost:3000/health 2>/dev/null | grep -q '"status":"ok"'; then
  ok "/health returned status:ok"
else
  bad "/health did not return status:ok"
fi

# --- check 2: postgres not published to host -------------------------------
note "Check: postgres is not published to the host"
if [ -z "$("${DC[@]}" port postgres 5432 2>/dev/null || true)" ]; then
  ok "postgres has no host port mapping"
else
  bad "postgres IS published to the host"
fi

# --- check 3: media persists across down/up --------------------------------
note "Check: media volume persists across down/up"
PROBE="persist-$(date +%s)"
"${DC[@]}" exec -T app sh -c "echo ${PROBE} > /app/public/media/_probe.txt"
"${DC[@]}" down            # no -v: keep volumes
"${DC[@]}" up -d
# wait briefly for the app to be back
for _ in $(seq 1 30); do
  s="$(docker inspect -f '{{.State.Health.Status}}' "$("${DC[@]}" ps -q app)" 2>/dev/null || echo starting)"
  [ "$s" = "healthy" ] && break; sleep 5
done
if "${DC[@]}" exec -T app cat /app/public/media/_probe.txt 2>/dev/null | grep -q "$PROBE"; then
  ok "media survived down/up"
else
  bad "media did NOT survive down/up"
fi

# --- summary ----------------------------------------------------------------
note "Summary"
printf '  %d passed, %d failed\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ] && printf '\n\033[32mALL CHECKS PASSED\033[0m\n' || printf '\n\033[31mSOME CHECKS FAILED\033[0m\n'
exit "$FAIL"
