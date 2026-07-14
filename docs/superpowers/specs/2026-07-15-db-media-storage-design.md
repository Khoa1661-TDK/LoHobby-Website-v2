# DB-Backed Media Storage — Design

**Date:** 2026-07-15
**Status:** Approved

## Problem

Media binaries live only on the host filesystem (`public/media`, bind-mounted into
the app container, excluded from the Docker image via `.dockerignore`). The Payload
database (shared Postgres on the employer's always-on machine) holds only metadata
rows. Any other machine that runs the same image against the same DB has an empty
media directory, so every image 404s. Admin uploads on one machine never reach the
others.

## Goal

Store media file bytes in the shared Postgres database so that any machine
connecting to that DB serves all images automatically, including uploads made from
other machines. Dataset today: 715 files, 89 MB, largest < 2 MB.

## Decision

Postgres bytea storage via a custom Payload storage adapter (approach A).
Rejected alternatives:

- **MinIO / S3-compatible object storage** — the conventional answer, but adds a
  service to install, secure, and back up on the employer machine to solve an
  89 MB problem. Revisit if the catalog grows toward multi-GB or origin traffic
  gets heavy.
- **Keep filesystem, sync via git/rsync** — does not meet the goal; admin uploads
  still diverge between machines without manual syncing.

## Design

### 1. New table (Prisma schema)

Prisma owns the non-Payload schema (coupons, gift cards, campaigns), so the blob
table goes there:

```prisma
model MediaFile {
  filename  String   @id
  mimeType  String
  size      Int
  data      Bytes
  updatedAt DateTime @updatedAt
}
```

Delivered as a normal Prisma migration. Payload's `media` collection rows are
unchanged — they keep holding metadata (alt, filename, URL); only the binary
moves. Check `prisma migrate status` against the shared DB before creating the
migration (remote ledger has drifted before).

### 2. Custom storage adapter

New dependency `@payloadcms/plugin-cloud-storage@3.84.1` (the official adapter
extension point used by the S3/Azure adapters). Custom adapter for the `media`
collection:

- `handleUpload` — upsert `MediaFile` row from the incoming buffer.
- `handleDelete` — delete the row by filename.
- `staticHandler` — serve bytes for Payload's own `/api/media/file/:filename`
  admin path.
- The plugin disables local disk writes. The Media collection defines no
  `imageSizes`, so it is one row per upload — no variant fan-out.
- **Size cap:** reject uploads over 25 MB with a clear error. The collection
  allows `video/*`, and unbounded video in bytea is the one way this design
  degrades badly. All current files are < 2 MB.

### 3. Serving path

`app/media/[...path]/route.ts` (already the runtime serving seam for `/media/*`)
changes from disk reads to:

1. Look up `MediaFile` by filename → serve with stored `mimeType`,
   `Content-Length` from `size`, and the existing
   `Cache-Control: public, max-age=86400`.
2. **Disk fallback:** if no row exists, serve from `public/media` as today. This
   makes the cutover risk-free and keeps old machines working during transition.

Everything downstream is untouched: public URLs stay `/media/<filename>`, so the
`relativizeMediaUrl` hook, product image snapshots (`storedImage`/`storedGallery`
persist URLs), `next/image`, and the middleware matcher all keep working as-is.

### 4. One-time import

`scripts/import-media-to-db.ts` — walk `public/media`, upsert every file into
`MediaFile` (idempotent, re-runnable). Run once against the shared DB; every
machine then has all images.

### 5. Explicitly out of scope (follow-up decisions)

- Removing the `./public/media` bind mount from docker-compose.
- Un-tracking `public/media` from git / slimming the repo.

Both wait until DB serving is verified in production. The disk fallback makes
keeping them harmless.

## Error handling

- DB error while serving → 500 with structured log (do not mask as 404).
- Missing row + missing disk file → 404 (unchanged behavior).
- Upload over size cap → Payload surfaces the adapter's error to the admin UI.

## Testing

- Unit (Vitest): adapter upsert/delete/size-cap logic; route lookup + disk
  fallback + path traversal safety (preserve existing behavior).
- End-to-end: upload via admin → row exists in `MediaFile` → `/media/<file>`
  serves from DB with the local mount removed; delete via admin removes the row.
- Import script: run twice, second run is a no-op; spot-check a served image.

## Known trade-offs

- Cold image loads cross the network to the employer's DB (~once per image per
  machine thanks to next/image caching + Cache-Control).
- `pg_dump` grows by ~90 MB and with the catalog.
- Postgres-as-blob-store is unconventional; deliberate choice at this scale.
