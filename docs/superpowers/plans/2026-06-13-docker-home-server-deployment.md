# Docker Home-Server Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package the Next.js 15 + Payload CMS storefront as a self-contained Docker Compose stack (app + PostgreSQL + Caddy auto-TLS) deployable on a home server over a public domain.

**Architecture:** A single `docker compose` stack with three services on an internal network. Caddy is the only service publishing host ports (80/443) and terminates TLS, reverse-proxying to the app on internal `:3000`. The app runs `next start` with full `node_modules` (no standalone output) and auto-migrates the database on boot via an entrypoint script. PostgreSQL stays internal. Media and DB data live on named volumes.

**Tech Stack:** Docker, Docker Compose, `node:22-bookworm-slim`, pnpm (via corepack), PostgreSQL 16, Caddy 2, Next.js 15, Payload CMS 3.84, Prisma 7.

**Important repo-specific note (applies to every Docker/entrypoint command):** This project's `pnpm <script>` invocations can fail a deps-status precheck (`runDepsStatusCheck`). In the Dockerfile and entrypoint, call the binaries directly from `node_modules/.bin/` (e.g. `node_modules/.bin/next`, `node_modules/.bin/prisma`, `node_modules/.bin/tsx`) instead of `pnpm build` / `pnpm start`. `pnpm install` itself is fine.

---

## File Structure

| File | Status | Responsibility |
|------|--------|----------------|
| `lib/locale-routing.ts` | Modify | Add `/health` to `NON_LOCALIZED_PREFIXES` so the healthcheck bypasses locale prefixing |
| `lib/__tests__/locale-routing.test.ts` | Create | Unit test that `/health` is treated as a non-localized root |
| `app/health/route.ts` | Create | Liveness route handler returning `{ status: "ok" }` |
| `.dockerignore` | Create | Keep build context small; exclude secrets and build artifacts |
| `.env.example` | Create | Document every env key with placeholders (committed; no secrets) |
| `Dockerfile` | Create | Multi-stage build producing the runtime app image |
| `docker/entrypoint.sh` | Create | Wait-for-db, run migrations, exec `next start` |
| `docker-compose.yml` | Create | Orchestrate app + postgres + caddy with volumes/healthchecks |
| `docker/Caddyfile` | Create | Reverse proxy + auto-TLS + security headers |
| `docs/deploy/home-server.md` | Create | Operator runbook: prerequisites, deploy, backup, rollback |

---

### Task 1: `/health` route bypasses locale prefixing

**Files:**
- Modify: `lib/locale-routing.ts:9`
- Test: `lib/__tests__/locale-routing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/locale-routing.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { isNonLocalizedRoot } from '@/lib/locale-routing';

describe('isNonLocalizedRoot', () => {
  it('should treat /health as a non-localized root so it bypasses locale prefixing', () => {
    expect(isNonLocalizedRoot('/health')).toBe(true);
  });

  it('should still localize a normal storefront path', () => {
    expect(isNonLocalizedRoot('/products-listing')).toBe(false);
  });

  it('should keep treating /products as non-localized', () => {
    expect(isNonLocalizedRoot('/products')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node_modules/.bin/vitest run lib/__tests__/locale-routing.test.ts`
Expected: FAIL — the `/health` assertion returns `false`.

- [ ] **Step 3: Add `/health` to the non-localized prefixes**

In `lib/locale-routing.ts`, change the `NON_LOCALIZED_PREFIXES` array:

```typescript
export const NON_LOCALIZED_PREFIXES = ['/products', '/icon', '/opengraph-image', '/health'] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node_modules/.bin/vitest run lib/__tests__/locale-routing.test.ts`
Expected: PASS (3 passing).

- [ ] **Step 5: Commit**

```bash
git add lib/locale-routing.ts lib/__tests__/locale-routing.test.ts
git commit -m "feat(health): exclude /health from locale prefixing"
```

---

### Task 2: `/health` route handler

**Files:**
- Create: `app/health/route.ts`

- [ ] **Step 1: Create the route handler**

Create `app/health/route.ts`:

```typescript
// app/health/route.ts — fast liveness probe for the compose healthcheck and
// external uptime monitoring. No dependency checks (DB/cache) by design: it
// answers "is the process up", not "is the system healthy".
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { status: 'ok', version: process.env.npm_package_version ?? 'unknown' },
    { status: 200 },
  );
}
```

- [ ] **Step 2: Verify it builds and responds locally**

Run (against your existing local dev server, in a second terminal):
`node_modules/.bin/next build >/dev/null 2>&1 && echo BUILD_OK`
Expected: prints `BUILD_OK` (route compiles with no type/route errors).

If a dev server is already running, also: `curl -s localhost:3000/health`
Expected: `{"status":"ok","version":"..."}`

- [ ] **Step 3: Commit**

```bash
git add app/health/route.ts
git commit -m "feat(health): add /health liveness route handler"
```

---

### Task 3: `.dockerignore`

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

Create `.dockerignore`:

```
# Dependencies & build output (reinstalled/rebuilt inside the image)
node_modules
.next
generated
out
build

# Secrets — never copy real env into the image
.env
.env.*
!.env.example

# Local data that must not enter the image
public/media
*.sql
*.sql.gz
*.tgz

# VCS, docs, editor, CI noise
.git
.gitignore
docs
.claude
.vscode
.idea
*.log
coverage
.DS_Store
Thumbs.db
```

- [ ] **Step 2: Verify the ignore patterns resolve**

Run: `git check-ignore -v public/media .env node_modules || true`
Expected: prints matching ignore rules (confirms these paths exist/are ignorable). This is a sanity check; `.dockerignore` itself is read by `docker build`.

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "chore(docker): add .dockerignore"
```

---

### Task 4: `.env.example`

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Create `.env.example`**

Create `.env.example` (placeholders only — no real secrets):

```bash
# =============================================================================
# Database — PostgreSQL connection string (Prisma + Payload).
# In the Docker Compose stack, host is the service name `postgres`.
# Must match POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB below.
# =============================================================================
DATABASE_URL=postgresql://shopnex:CHANGE_ME@postgres:5432/shopnex?schema=public

# Credentials used by the bundled postgres service (compose `env_file`).
POSTGRES_USER=shopnex
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=shopnex

# =============================================================================
# Payload CMS — admin session encryption secret. Generate: openssl rand -base64 32
# =============================================================================
PAYLOAD_SECRET=CHANGE_ME

# =============================================================================
# NextAuth (Auth.js v5)
# =============================================================================
# JWT secret (falls back to PAYLOAD_SECRET if unset). Generate: openssl rand -base64 32
AUTH_SECRET=CHANGE_ME
# Canonical public base URL — your real domain, https.
AUTH_URL=https://your-domain.example
# Google OAuth (optional). Redirect URI to authorize in Google console:
#   https://your-domain.example/api/auth/callback/google
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=

# =============================================================================
# Public URLs — SEO, redirects, absolute URLs. Use your real domain.
# =============================================================================
NEXT_PUBLIC_APP_URL=https://your-domain.example
NEXT_PUBLIC_SITE_URL=https://your-domain.example

# =============================================================================
# Branding (can be overridden via Payload CMS)
# =============================================================================
NEXT_PUBLIC_SITE_NAME=Your Store
NEXT_PUBLIC_BRAND_TAGLINE=
NEXT_PUBLIC_CONTACT_EMAIL=
NEXT_PUBLIC_CONTACT_PHONE=
NEXT_PUBLIC_CONTACT_ADDRESS=

# =============================================================================
# Payments & secrets
# =============================================================================
# Encryption key for stored payment credentials (falls back to AUTH_SECRET).
# Generate: openssl rand -base64 32
PAYMENT_SECRETS_KEY=CHANGE_ME
# PayOS (Vietnamese gateway). Encrypted credentials live on the CMS payment method.
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=

# =============================================================================
# Admin allowlist — comma-separated emails allowed into Payload admin.
# =============================================================================
ADMIN_EMAILS=you@example.com

# =============================================================================
# Page-builder live preview / draft mode (admin-only token).
# Generate: openssl rand -base64 32
# =============================================================================
PREVIEW_SECRET=CHANGE_ME

# Public domain used by Caddy for TLS (read by docker-compose / Caddyfile).
DOMAIN=your-domain.example
```

- [ ] **Step 2: Confirm `.env.example` is NOT ignored**

Run: `git check-ignore .env.example || echo NOT_IGNORED`
Expected: prints `NOT_IGNORED` (the `!.env.example` rule keeps it trackable).

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "docs(env): add .env.example documenting all config keys"
```

---

### Task 5: `Dockerfile` (multi-stage build)

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create the Dockerfile**

Create `Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1

# --- base: Node 22 + pnpm via corepack -------------------------------------
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH="$PNPM_HOME:$PATH"
# wget is used by the compose healthcheck; ca-certificates for TLS to APIs.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates wget \
 && rm -rf /var/lib/apt/lists/* \
 && corepack enable
WORKDIR /app

# --- deps: install ALL dependencies (devDeps included: tsx/prisma needed at runtime) ---
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- build: compile Next.js + Payload --------------------------------------
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Call binaries directly (project `pnpm <script>` hits a deps-status precheck).
RUN node_modules/.bin/prisma generate \
 && node_modules/.bin/next build \
 && node_modules/.bin/payload generate:importmap

# --- runtime: run the built app as non-root --------------------------------
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
COPY --from=build /app ./
# public/media is a mounted volume at runtime; ensure the dir exists and is owned.
RUN mkdir -p /app/public/media \
 && chown -R node:node /app/public/media \
 && chmod +x docker/entrypoint.sh
USER node
EXPOSE 3000
ENTRYPOINT ["docker/entrypoint.sh"]
```

- [ ] **Step 2: Build the image**

Run: `docker build -t shopnex-app:dev .`
Expected: build completes with `naming to docker.io/library/shopnex-app:dev` (or equivalent success line). The `build` stage runs `next build` to completion.

> If the build fails inside `next build` because env vars are required at build time, note which var and add it as a build arg in a follow-up; do NOT bake secrets into the image. (Most `NEXT_PUBLIC_*` are read at runtime here; revisit only if the build errors.)

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat(docker): add multi-stage Dockerfile for the app image"
```

---

### Task 6: `entrypoint.sh` (auto-migrate then start)

**Files:**
- Create: `docker/entrypoint.sh`

- [ ] **Step 1: Create the entrypoint script**

Create `docker/entrypoint.sh`:

```bash
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
```

- [ ] **Step 2: Make it executable and lint syntax**

Run: `chmod +x docker/entrypoint.sh && bash -n docker/entrypoint.sh && echo SYNTAX_OK`
Expected: prints `SYNTAX_OK` (no bash syntax errors).

- [ ] **Step 3: Commit**

```bash
git add docker/entrypoint.sh
git commit -m "feat(docker): add entrypoint that migrates then starts the app"
```

---

### Task 7: `docker-compose.yml`

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create the compose file**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    restart: unless-stopped
    env_file: .env
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - appnet
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}']
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: shopnex-app:latest
    restart: unless-stopped
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - media:/app/public/media
    networks:
      - appnet
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost:3000/health']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 60s

  caddy:
    image: caddy:2
    restart: unless-stopped
    depends_on:
      - app
    ports:
      - '80:80'
      - '443:443'
    env_file: .env
    volumes:
      - ./docker/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - appnet

networks:
  appnet:
    driver: bridge

volumes:
  pgdata:
  media:
  caddy_data:
  caddy_config:
```

- [ ] **Step 2: Validate compose syntax**

Run: `docker compose config >/dev/null && echo COMPOSE_OK`
Expected: prints `COMPOSE_OK` (compose interpolates `.env` and validates the schema). Requires a `.env` derived from `.env.example` to exist.

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add compose stack (app + postgres + caddy)"
```

---

### Task 8: `Caddyfile`

**Files:**
- Create: `docker/Caddyfile`

- [ ] **Step 1: Create the Caddyfile**

Create `docker/Caddyfile`:

```caddyfile
{$DOMAIN} {
	encode zstd gzip
	reverse_proxy app:3000

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "SAMEORIGIN"
		Referrer-Policy "strict-origin-when-cross-origin"
		-Server
	}
}
```

- [ ] **Step 2: Validate the Caddyfile**

Run: `docker run --rm -e DOMAIN=your-domain.example -v "$PWD/docker/Caddyfile:/etc/caddy/Caddyfile:ro" caddy:2 caddy validate --config /etc/caddy/Caddyfile && echo CADDY_OK`
Expected: prints `Valid configuration` then `CADDY_OK`.

- [ ] **Step 3: Commit**

```bash
git add docker/Caddyfile
git commit -m "feat(docker): add Caddy reverse-proxy config with auto-TLS"
```

---

### Task 9: Operator runbook

**Files:**
- Create: `docs/deploy/home-server.md`

- [ ] **Step 1: Create the deployment runbook**

Create `docs/deploy/home-server.md`:

````markdown
# Home-Server Deployment Runbook

Self-contained Docker Compose stack: app + PostgreSQL + Caddy (auto-TLS).

## Prerequisites (one-time, outside Docker)

1. **DNS:** Create an A record for your domain pointing at the server's public
   IP. Home IPs are usually dynamic — use a DDNS provider to keep it current.
2. **Router:** Forward TCP **80** and **443** to the server.
3. **Google OAuth (if used):** In the Google Cloud console, add
   `https://<domain>/api/auth/callback/google` as an authorized redirect URI.
4. **Docker:** Install Docker Engine + the Compose plugin on the server.

## First deploy

```bash
cp .env.example .env
# Edit .env: set DOMAIN, POSTGRES_*, DATABASE_URL (host=postgres), all secrets.
# Generate secrets with: openssl rand -base64 32

docker compose build
docker compose up -d
docker compose ps        # all services should become healthy
```

Migrations run automatically on app startup. Then seed once:

```bash
docker compose exec app node_modules/.bin/tsx scripts/seed-payload-admin.ts
# Optional catalog/content seeds:
docker compose exec app node_modules/.bin/tsx scripts/seed-payload-categories.ts
docker compose exec app node_modules/.bin/tsx scripts/seed-payload-products.ts
```

Verify: `curl -s https://<domain>/health` → `{"status":"ok",...}`, and
`/admin` loads.

## Updating to a new version

```bash
git pull
docker compose build
docker compose up -d        # recreates app/caddy; migrations re-run on boot
```

## Backups

```bash
# Database
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" \
  | gzip > backup-db-$(date +%F).sql.gz

# Media (volume name is <project>_media; check `docker volume ls`)
docker run --rm -v "$(basename "$PWD")_media:/m" -v "$PWD:/out" alpine \
  tar czf /out/backup-media-$(date +%F).tgz -C /m .
```

## Restore

```bash
gunzip -c backup-db-YYYY-MM-DD.sql.gz \
  | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

## Rollback

Images are tagged `shopnex-app:latest` per build. Before a risky update, tag the
current image: `docker tag shopnex-app:latest shopnex-app:prev`. To roll back,
set `image: shopnex-app:prev` for the `app` service (and skip `build`), then
`docker compose up -d app`.

## Notes

- PostgreSQL is **not** published to the host — only reachable on the internal
  `appnet` network.
- Uploaded media persists in the `media` volume across `docker compose down`.
  Never run `docker compose down -v` unless you intend to delete all data.
````

- [ ] **Step 2: Commit**

```bash
git add docs/deploy/home-server.md
git commit -m "docs(deploy): add home-server runbook (deploy, backup, rollback)"
```

---

### Task 10: End-to-end stack verification

**Files:** none (verification only)

- [ ] **Step 1: Prepare a local `.env`**

Run:
```bash
cp .env.example .env
# Set POSTGRES_PASSWORD and DATABASE_URL password to a test value, and
# DOMAIN=localhost for a local (non-TLS-validated) smoke test.
```

- [ ] **Step 2: Bring the stack up**

Run: `docker compose up -d --build`
Expected: `postgres`, `app`, `caddy` all start.

- [ ] **Step 3: Wait for app health**

Run: `docker compose ps`
Expected: `app` reaches `healthy` (allow up to the 60s `start_period` + migration time). If not, inspect: `docker compose logs app`.

- [ ] **Step 4: Hit the health endpoint through the app**

Run: `docker compose exec app wget -qO- http://localhost:3000/health`
Expected: `{"status":"ok","version":"..."}`

- [ ] **Step 5: Confirm Postgres is NOT published to the host**

Run: `docker compose port postgres 5432 || echo NOT_PUBLISHED`
Expected: prints `NOT_PUBLISHED` (no host mapping for the DB).

- [ ] **Step 6: Confirm media persistence across a restart**

Run:
```bash
docker compose exec app sh -c 'echo persist-test > /app/public/media/_probe.txt'
docker compose down
docker compose up -d
docker compose exec app cat /app/public/media/_probe.txt
```
Expected: prints `persist-test` (the `media` volume survived the down/up). Clean up: `docker compose exec app rm /app/public/media/_probe.txt`.

- [ ] **Step 7: Tear down the smoke test**

Run: `docker compose down`  (NOTE: no `-v` — keep the volumes.)
Expected: containers removed; `pgdata` and `media` volumes retained.

- [ ] **Step 8: Final commit (if any tracked files changed during verification)**

```bash
git status
# Only commit intended files; do NOT commit .env.
```

---

## Self-Review

**Spec coverage check** (against `docs/superpowers/specs/2026-06-13-docker-home-server-deployment-design.md`):

| Spec item | Task |
|-----------|------|
| Multi-stage app image, `next start`, no standalone | Task 5 |
| `.dockerignore` excludes secrets/artifacts | Task 3 |
| `.env.example` documenting all keys | Task 4 |
| `/health` route outside locale group | Tasks 1–2 |
| Entrypoint: wait-for-db → Prisma migrate → Payload push → start | Task 6 (wait-for-db handled by compose `depends_on: service_healthy`) |
| Seeding manual, not in entrypoint | Task 6 (excluded) + Task 9 runbook |
| Compose: app + postgres + caddy, internal network, volumes, healthchecks | Task 7 |
| Postgres not published | Task 7 + verified Task 10 Step 5 |
| Media persistent volume | Task 7 + verified Task 10 Step 6 |
| Caddy auto-TLS + security headers | Task 8 |
| Backups / rollback / prerequisites documented | Task 9 |
| Google OAuth redirect URI note | Task 4 comment + Task 9 |
| Acceptance: stack healthy, /health 200, media survives down/up | Task 10 |

No gaps found.

**Type/identifier consistency:** `isNonLocalizedRoot` / `NON_LOCALIZED_PREFIXES` match `lib/locale-routing.ts`. Service names (`postgres`, `app`, `caddy`), volume names (`pgdata`, `media`, `caddy_data`, `caddy_config`), and `DATABASE_URL` host (`postgres`) are consistent across the Dockerfile, compose, Caddyfile, and runbook. Binaries are invoked from `node_modules/.bin/` consistently in the Dockerfile and entrypoint.

**Placeholder scan:** No "TBD"/"TODO"/"handle edge cases" placeholders; every code/command step contains concrete content.
