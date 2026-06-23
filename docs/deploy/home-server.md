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

## Backups & Restore

Automated daily backups, offsite copies, the monthly **restore drill**, and
disaster recovery are documented in their own runbook:
**[backups.md](./backups.md)**. Set this up before going live — an untested
backup is not a backup.

Quick one-off dump (full procedure is in the runbook):

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" --format=custom \
  --no-owner "$POSTGRES_DB" > db-$(date +%F).dump
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
