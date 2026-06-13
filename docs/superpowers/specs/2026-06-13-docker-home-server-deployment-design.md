# Docker Home-Server Deployment — Design Spec

**Date:** 2026-06-13
**Status:** Approved (design), pending implementation plan
**Author:** Brainstormed with Claude

## Goal

Package the ShopNex Next.js 15 + Payload CMS storefront as a self-contained
Docker Compose stack that runs on a home server, served over a public domain
with automatic HTTPS. One `docker compose up -d` brings up the database, the
app, and a TLS-terminating reverse proxy.

## Constraints & Context

- **App:** Next.js 15 (App Router) + Payload CMS 3.84, TypeScript, pnpm.
- **Dual database layer:** Payload (native Postgres collections) and Prisma
  (coupons, gift cards, campaigns) share one PostgreSQL database.
- **Media:** Payload writes uploads to the local filesystem at
  `public/media` (`Media.ts` → `staticDir`). This MUST be a persistent volume
  or every redeploy loses uploaded images.
- **Native deps:** `sharp` (image processing) and `pg`/`@prisma/adapter-pg`
  (native Postgres). The runtime image must include the OS libraries these need.
- **No `output: 'standalone'`** in `next.config.mjs` — runtime uses `next start`
  with full `node_modules` (see Decision 1).
- **Secrets:** All config comes from env vars (`DATABASE_URL`, `PAYLOAD_SECRET`,
  `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_*`, `NEXT_PUBLIC_*`, `PAYOS_*`,
  `PAYMENT_SECRETS_KEY`, `PREVIEW_SECRET`, `ADMIN_EMAILS`). `.env` is already
  git-ignored.

### User decisions (from brainstorming)

| Decision | Choice |
|----------|--------|
| PostgreSQL | Bundled as a service in the compose stack |
| HTTPS / reverse proxy | Caddy in the stack, automatic Let's Encrypt TLS |
| Migrations | Run automatically on container start |
| Access | Public domain (internet-reachable) |

## Architecture

Single Docker Compose stack with three services on an internal network. Only
Caddy publishes ports to the host.

```
home server
└── docker compose (internal network: appnet)
    ├── caddy      publishes :80 + :443 to host
    │              reverse-proxies  https://<domain>  →  app:3000
    │              auto-TLS via Let's Encrypt
    ├── app        internal :3000  (Next.js + Payload, this repo)
    │              entrypoint: wait-for-db → migrate → next start
    └── postgres   internal :5432  (PostgreSQL 16) — never published
```

### Persistent named volumes

| Volume | Mount | Purpose |
|--------|-------|---------|
| `pgdata` | postgres data dir | Database persistence |
| `media` | `/app/public/media` (app) | Payload uploaded images |
| `caddy_data` | Caddy data dir | TLS certificates + ACME state |
| `caddy_config` | Caddy config dir | Caddy autosave config |

Postgres is bound only to the internal `appnet` network — not exposed to the
LAN or internet, per deploy rules.

## Components

### 1. App image — multi-stage `Dockerfile`

Base: `node:22-bookworm-slim` (Node 22 matches `@types/node` 22 and satisfies
Payload's engine requirement). pnpm via `corepack`.

| Stage | Responsibility |
|-------|----------------|
| `base` | Node + corepack/pnpm + OS libs for `sharp` |
| `deps` | Copy `package.json` + `pnpm-lock.yaml`; `pnpm install --frozen-lockfile` |
| `build` | Copy source; `pnpm build` (`prisma generate && next build`); `payload generate:importmap` |
| `runtime` | Copy built app + node_modules; non-root `node` user; entrypoint; `CMD ["pnpm","start"]` |

A `.dockerignore` excludes `node_modules`, `.next`, `.git`, `.env*`, `docs/`,
`.claude/`, and other build-irrelevant paths to keep build context small.

### 2. `entrypoint.sh` (app startup)

Runs on every `app` boot:

1. Wait for `postgres` to accept connections (relies on compose
   `depends_on: condition: service_healthy`).
2. `prisma migrate deploy` — applies Prisma migrations (coupons/gift cards/
   campaigns).
3. Payload schema sync — `tsx scripts/payload-db-push.ts` (or `payload migrate`
   if migration files exist) to bring Payload's tables up to date.
4. `exec` into `next start`.

**Seeding is NOT in the entrypoint.** Admin user, categories, and products are
one-off operations run manually:
`docker compose exec app pnpm payload:seed-admin` (and the other `payload:seed-*`
scripts) after first boot.

### 3. `docker-compose.yml`

- `app`: builds from the Dockerfile, `env_file: .env`, `depends_on` postgres
  healthy, mounts `media` volume, healthcheck against `/health`,
  `restart: unless-stopped`.
- `postgres`: `postgres:16`, `env_file` for `POSTGRES_*`, `pgdata` volume,
  `pg_isready` healthcheck, `restart: unless-stopped`, no published ports.
- `caddy`: `caddy:2`, publishes 80/443, mounts `Caddyfile` + caddy volumes,
  `restart: unless-stopped`.

### 4. `Caddyfile`

Single site block: `<domain>` reverse-proxies to `app:3000`. Caddy handles
HTTP→HTTPS redirect, certificate issuance/renewal, and security headers
(HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy).

### 5. `/health` route (new code)

A lightweight route handler returning `{ "status": "ok" }` (HTTP 200), no
dependency checks, for the compose healthcheck and external uptime monitoring.
Lives in the app (route group `app/[locale]/...` or a top-level
`app/health/route.ts` outside the locale group to avoid i18n redirects).

### 6. `.env.example` (new, committed)

Documents every required and optional env key with placeholder values and
comments. No real secrets. Mirrors the existing `.env` structure, including the
note that `DATABASE_URL` must use the internal `postgres` service hostname in
the compose context.

## Data Flow

1. Browser → `https://<domain>` → Caddy (TLS termination).
2. Caddy → `app:3000` over internal network.
3. App reads/writes Postgres at `postgres:5432` (Payload + Prisma).
4. App writes/reads uploaded media at `/app/public/media` (persistent volume),
   served back through Next/Payload.

## Operations

### Backups (documented commands, cron-able)

- Database: `docker compose exec -T postgres pg_dump -U <user> <db> | gzip > backup-$(date +%F).sql.gz`
- Media: `docker run --rm -v <stack>_media:/m -v $PWD:/out alpine tar czf /out/media-$(date +%F).tgz -C /m .`

### Rollback

- Build images with an explicit tag; keep the previous tag.
- Roll back by pinning the previous image tag in compose and `docker compose up -d`.

### Healthchecks

- `postgres`: `pg_isready`.
- `app`: `wget`/`curl` against `http://localhost:3000/health`.

## Prerequisites (outside the compose file — documented in README/spec)

- DNS A record for `<domain>` pointing at the home server's public IP. Home IPs
  are usually dynamic — use a DDNS provider to keep the record current.
- Router port-forwarding for TCP 80 and 443 to the server.
- Google OAuth: add `https://<domain>/api/auth/callback/google` as an authorized
  redirect URI in the Google Cloud console (manual console step).

## Decisions

### Decision 1 — `next start` over `output: 'standalone'`

**Chosen:** Run the runtime container with full `node_modules` via `next start`.
**Alternatives:** Next.js standalone output (smaller image).
**Why:** Payload CMS frequently breaks under standalone output (missing admin
import-map and richtext assets that the standalone tracer doesn't copy).
Reliability on an unattended home server outweighs image-size savings.
**Trade-offs:** Larger runtime image (full deps). Slower image pulls.
**Revisit if:** Image size becomes a real constraint and standalone can be
verified to include all Payload assets.

### Decision 2 — Auto-migrate, manual seed

**Chosen:** Entrypoint runs migrations every boot; seeding is manual.
**Why:** Migrations are idempotent and must match the deployed code. Seeds are
one-off and destructive/duplicative if re-run.
**Trade-offs:** Slightly slower app startup; first-boot requires a manual seed
step.

### Decision 3 — Bundle Postgres + Caddy in one stack

**Chosen:** Single compose stack owns DB and reverse proxy.
**Why:** Self-contained home-server deployment; no external dependencies to
provision. Matches user decision.
**Trade-offs:** This stack owns the DB lifecycle; sharing the DB with other apps
would require revisiting.

## Out of Scope (YAGNI)

- CI/CD pipeline / automated image publishing.
- Multi-host orchestration (Kubernetes, Swarm).
- Object storage (S3) for media — local volume is sufficient for a home server.
- Automated backup *service* — documented manual/cron commands only (can be
  revisited if desired).
- Standalone-output optimization (see Decision 1).

## Acceptance Criteria

- `docker compose up -d` brings up postgres, app, and caddy; all become healthy.
- App is reachable at `https://<domain>` with a valid TLS certificate.
- Payload admin (`/admin`) loads and persists data to Postgres.
- Uploaded media survives `docker compose down && docker compose up -d`.
- Database schema is migrated automatically on first boot (no manual migrate).
- `/health` returns 200.
- Postgres port is not reachable from the host/LAN.
- `.env.example` documents every key; no secrets are committed.
