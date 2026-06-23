# Database Backup & Restore Runbook

Authoritative procedure for backing up and restoring the PostgreSQL database
that holds **everything transactional** — orders, products, content, customers,
coupons/gift cards. Losing it without a backup ends the business, so this is a
P1 production requirement, not optional.

This runbook targets the self-hosted Docker Compose stack (see
[home-server.md](./home-server.md)). If you move to managed Postgres, see
[Managed Postgres](#managed-postgres) below.

> **The rule:** an untested backup is not a backup. The
> [restore drill](#restore-drill-do-this-monthly) is part of this runbook, not a
> nice-to-have.

---

## What to back up

| Asset | Where | Covered by |
|-------|-------|-----------|
| All DB data (Payload + Prisma schemas, same DB) | `postgres` container | `pg_dump` below |
| Uploaded media | `media` Docker volume | media tarball below |
| Secrets (`.env`) | server filesystem | **back up out-of-band**, encrypted, never in the same store as the DB dump |

---

## Automated daily backup (cron)

A single script dumps the DB + media, prunes old copies, and is safe to run from
the host's crontab. Postgres is not published to the host, so it runs via
`docker compose exec`.

`/opt/shopnex/backup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd /opt/shopnex                      # repo dir containing docker-compose.yml + .env
set -a; source .env; set +a          # load POSTGRES_USER / POSTGRES_DB
DEST="/var/backups/shopnex"
RETENTION_DAYS=14
STAMP="$(date +%F-%H%M)"
mkdir -p "$DEST"

# --- Database (consistent single-transaction dump) ---
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" --format=custom --no-owner "$POSTGRES_DB" \
  > "$DEST/db-$STAMP.dump"

# --- Media volume ---
docker run --rm \
  -v "$(basename "$PWD")_media:/m:ro" -v "$DEST:/out" alpine \
  tar czf "/out/media-$STAMP.tgz" -C /m .

# --- Prune backups older than retention window ---
find "$DEST" -name 'db-*.dump'  -mtime "+$RETENTION_DAYS" -delete
find "$DEST" -name 'media-*.tgz' -mtime "+$RETENTION_DAYS" -delete

echo "backup ok: $DEST/db-$STAMP.dump"
```

Install + schedule (daily at 03:30):

```bash
sudo install -m 0750 /opt/shopnex/backup.sh /opt/shopnex/backup.sh
( crontab -l 2>/dev/null; echo "30 3 * * * /opt/shopnex/backup.sh >> /var/log/shopnex-backup.log 2>&1" ) | crontab -
```

`--format=custom` (not plain SQL) is used so restores can run in parallel with
`pg_restore -j` and selectively skip objects if needed.

### Offsite copy (do not skip)

A backup on the same disk as the database dies with the disk. Sync the backup
dir offsite after each run — append to `backup.sh`:

```bash
# Example: encrypted offsite sync (configure rclone remote once: `rclone config`)
rclone sync "$DEST" "offsite:shopnex-backups" --transfers 2
```

Use any of: `rclone` to S3/B2/Drive, `restic`/`borg` (dedup + encryption), or
`scp` to a second machine. Whatever the target, it must be **off the server**.

---

## Restore drill (do this monthly)

Restoring into the live DB is destructive, so **always rehearse into a throwaway
database first**. This both verifies the backup and keeps the procedure in
muscle memory.

```bash
cd /opt/shopnex
set -a; source .env; set +a
BACKUP="/var/backups/shopnex/db-YYYY-MM-DD-HHMM.dump"   # pick a real file

# 1. Create a scratch database and restore into it (non-destructive).
docker compose exec -T postgres createdb -U "$POSTGRES_USER" shopnex_restore_test
docker compose exec -T postgres \
  pg_restore -U "$POSTGRES_USER" --no-owner -d shopnex_restore_test < "$BACKUP"

# 2. Sanity-check row counts against what you expect.
docker compose exec -T postgres psql -U "$POSTGRES_USER" shopnex_restore_test \
  -c "SELECT 'orders' t, count(*) FROM orders
      UNION ALL SELECT 'products', count(*) FROM products;"

# 3. Tear the scratch DB down.
docker compose exec -T postgres dropdb -U "$POSTGRES_USER" shopnex_restore_test
```

If step 2 shows plausible counts, the backup is good. Log the date you last
completed a successful drill.

---

## Real restore (disaster recovery)

Use only when the live database is actually lost/corrupt.

```bash
cd /opt/shopnex
set -a; source .env; set +a
BACKUP="/var/backups/shopnex/db-YYYY-MM-DD-HHMM.dump"

# 1. Stop the app so nothing writes mid-restore (keep postgres up).
docker compose stop app caddy

# 2. Recreate a clean database.
docker compose exec -T postgres dropdb   -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB"
docker compose exec -T postgres createdb -U "$POSTGRES_USER" "$POSTGRES_DB"

# 3. Restore (parallel).
docker compose exec -T postgres \
  pg_restore -U "$POSTGRES_USER" --no-owner -j 4 -d "$POSTGRES_DB" < "$BACKUP"

# 4. Restore media if needed.
docker run --rm -v "$(basename "$PWD")_media:/m" -v /var/backups/shopnex:/in alpine \
  sh -c "rm -rf /m/* && tar xzf /in/media-YYYY-MM-DD-HHMM.tgz -C /m"

# 5. Bring the app back. Payload/Prisma migrations re-run on boot.
docker compose up -d
curl -fsS https://"$DOMAIN"/health/ready   # should return 200 once DB is reachable
```

---

## Managed Postgres

If `DATABASE_URL` points at a managed provider (e.g. Prisma Postgres / Neon /
Supabase) instead of the compose `postgres` service:

- **Check the provider's snapshot guarantees** — frequency, retention, and
  whether point-in-time recovery (PITR) is included on your plan. Do not assume;
  many free/hobby tiers keep backups for only a few days or not at all.
- Still take your **own** logical dumps on the schedule above (`pg_dump` against
  the remote `DATABASE_URL`, run from the app container or a trusted host) so a
  provider outage or account loss is survivable.
- Run the [restore drill](#restore-drill-do-this-monthly) against a fresh
  database on the provider (or locally) the same way.

---

## Checklist

- [ ] `backup.sh` installed and in crontab; `/var/log/shopnex-backup.log` shows daily success
- [ ] Offsite sync configured and verified (a file actually lands offsite)
- [ ] `.env` backed up out-of-band, encrypted
- [ ] Restore drill completed within the last month (record the date)
- [ ] Retention window matches business needs (default 14 days)
