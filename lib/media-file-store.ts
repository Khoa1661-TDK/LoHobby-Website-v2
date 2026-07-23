// lib/media-file-store.ts
// Postgres-backed binary store for Payload media uploads. The shared DB is the
// source of truth for media bytes; Payload's `media` collection keeps metadata.
//
// Talks to Postgres directly via `pg` (no Prisma). The media path is being kept
// off Prisma deliberately, so this module owns a small `pg.Pool` on DATABASE_URL
// rather than reaching into the Prisma client. It stays free of any
// `import 'server-only'` (directly or transitively): it is reachable from
// payload.config.ts through the storage adapter, so it runs under plain tsx —
// `payload generate:importmap`, `payload migrate`, and every seed in scripts/ —
// not just inside Next, and `server-only` throws everywhere except under Next's
// `react-server` condition.
import { Pool } from 'pg';

export const MAX_MEDIA_FILE_BYTES = 25 * 1024 * 1024;

export interface StoredMediaFile {
  filename: string;
  mimeType: string;
  size: number;
  data: Uint8Array;
}

// Reuse a single pool across HMR reloads / repeated script imports so we don't
// leak connections (mirrors the Prisma singleton pattern this replaced).
const globalForPool = globalThis as unknown as { mediaFilePool?: Pool };

function pool(): Pool {
  if (globalForPool.mediaFilePool) return globalForPool.mediaFilePool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  // Small pool: this store handles occasional media reads/writes, not hot paths.
  const created = new Pool({ connectionString, max: 4 });
  globalForPool.mediaFilePool = created;
  return created;
}

export async function upsertMediaFile(input: {
  filename: string;
  mimeType: string;
  data: Uint8Array;
}): Promise<void> {
  if (input.data.byteLength > MAX_MEDIA_FILE_BYTES) {
    throw new Error(
      `Media file "${input.filename}" is ${input.data.byteLength} bytes; the database store caps files at ${MAX_MEDIA_FILE_BYTES} bytes`,
    );
  }
  // pg maps a Buffer to bytea. "updatedAt" is NOT NULL with no DB default (it was
  // Prisma's @updatedAt), so set it explicitly on both insert and update.
  const buffer = Buffer.from(input.data);
  await pool().query(
    `INSERT INTO "MediaFile" (filename, "mimeType", size, data, "updatedAt")
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (filename) DO UPDATE SET
       "mimeType" = EXCLUDED."mimeType",
       size       = EXCLUDED.size,
       data       = EXCLUDED.data,
       "updatedAt" = now()`,
    [input.filename, input.mimeType, input.data.byteLength, buffer],
  );
}

export async function deleteMediaFile(filename: string): Promise<void> {
  await pool().query(`DELETE FROM "MediaFile" WHERE filename = $1`, [filename]);
}

export async function getMediaFile(filename: string): Promise<StoredMediaFile | null> {
  const { rows } = await pool().query<{
    filename: string;
    mimeType: string;
    size: number;
    data: Buffer;
  }>(`SELECT filename, "mimeType", size, data FROM "MediaFile" WHERE filename = $1`, [filename]);
  const row = rows[0];
  if (!row) return null;
  return {
    filename: row.filename,
    mimeType: row.mimeType,
    size: row.size,
    data: new Uint8Array(row.data),
  };
}

// Cheap existence check (no bytes fetched) — used by the media-binary backfill
// to skip rows already restored without loading their data.
export async function hasMediaFile(filename: string): Promise<boolean> {
  const { rowCount } = await pool().query(`SELECT 1 FROM "MediaFile" WHERE filename = $1`, [
    filename,
  ]);
  return (rowCount ?? 0) > 0;
}
