# DB-Backed Media Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store Payload media file bytes in the shared Postgres DB (employer's 24/7 machine) so every machine connecting to that DB serves all images automatically.

**Architecture:** A Prisma-managed `MediaFile` table holds the binaries. A custom Payload storage adapter (via `@payloadcms/plugin-cloud-storage`) writes/deletes rows on upload/delete. The existing `/media/[...path]` route serves DB-first with disk fallback, so public URLs (`/media/<filename>`) never change. A one-time script imports the 715 existing files. Spec: `docs/superpowers/specs/2026-07-15-db-media-storage-design.md`.

**Tech Stack:** Next.js 15, Payload CMS 3.84, Prisma 7 (`prisma-client` generator → `generated/prisma`, driver adapter `PrismaPg`, `Bytes` maps to `Uint8Array`), Vitest 3, TypeScript strict.

## Global Constraints

- **Never run `pnpm <script>`** — it fails via `runDepsStatusCheck`. Call binaries directly: `node_modules/.bin/vitest`, `node_modules/.bin/prisma`, `node_modules/.bin/tsx`, `node_modules/.bin/tsc`, `node_modules/.bin/payload`. (`pnpm add` for installing packages is fine.)
- **`lib/prisma.ts` imports `'server-only'`.** Any module reachable from `payload.config.ts` (collections, plugins, the storage adapter) must NOT statically import it — `payload generate:importmap` loads the config under plain tsx where `server-only` throws. Use lazy `await import('./prisma')` inside functions only.
- **Test files must import `describe/it/expect/vi` from `vitest`** — `globals: true` is runtime-only; `tsc --noEmit` breaks otherwise.
- Vitest only picks up tests in `lib/__tests__/`, `app/**/__tests__/`, `components/**/__tests__/`, `scripts/__tests__/` (`*.test.ts`).
- `.env` `DATABASE_URL` points at the shared DB (`10.10.10.41:5432/mydatabase`) — migrations and the import script run against it directly. Do not switch it.
- Public media URLs stay exactly `/media/<filename>`. Do not change URL shapes anywhere.
- Upload size cap: **25 MB** (`MAX_MEDIA_FILE_BYTES = 25 * 1024 * 1024`).
- Solo project: commit directly to `main`, Conventional Commits, atomic commits.
- This is remote production-ish data: **no destructive SQL**, import script must be idempotent (upsert only).

---

### Task 1: Prisma `MediaFile` model + migration

**Files:**
- Modify: `prisma/schema.prisma` (append at end of file)

**Interfaces:**
- Produces: Prisma model `MediaFile` → client accessor `prisma.mediaFile` with fields `filename: string` (PK), `mimeType: string`, `size: number`, `data: Uint8Array`, `updatedAt: Date`.

- [ ] **Step 1: Check migration ledger state** (remote DB has drifted before)

Run: `node_modules/.bin/prisma migrate status`
Expected: "Database schema is up to date!" — if it reports pending/failed migrations, STOP and report to the user before creating a new migration.

- [ ] **Step 2: Append the model to `prisma/schema.prisma`**

```prisma

// Binary store for Payload media uploads. Payload's `media` collection keeps
// the metadata (alt, filename, url); this table holds the actual file bytes so
// every machine sharing this DB serves the same images. See
// docs/superpowers/specs/2026-07-15-db-media-storage-design.md.
model MediaFile {
  filename  String   @id
  mimeType  String
  size      Int
  data      Bytes
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 3: Create and apply the migration**

Run: `node_modules/.bin/prisma migrate dev --name add_media_file`
Expected: migration `*_add_media_file` created under `prisma/migrations/` and applied; client regenerated to `generated/prisma`. If shadow-database creation fails on the remote DB, STOP and present options to the user (per debug two-attempt rule) — do not fall back to `db push` silently.

- [ ] **Step 4: Verify the client knows the model**

Run: `node_modules/.bin/tsx -e "import { PrismaClient } from './generated/prisma/client'; console.log(typeof new PrismaClient({} as never).mediaFile)"`
Expected: prints `object` (accessor exists; constructor arg irrelevant here).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(media): add MediaFile table for db-backed media storage

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `lib/media-mime.ts` + `lib/media-file-store.ts` (TDD)

**Files:**
- Create: `lib/media-mime.ts`
- Create: `lib/media-file-store.ts`
- Test: `lib/__tests__/media-file-store.test.ts`, `lib/__tests__/media-mime.test.ts`

**Interfaces:**
- Consumes: `prisma.mediaFile` from Task 1 (lazily imported).
- Produces (used by Tasks 3–5):
  - `mimeTypeForFilename(filename: string): string`
  - `MAX_MEDIA_FILE_BYTES: number`
  - `interface StoredMediaFile { filename: string; mimeType: string; size: number; data: Uint8Array }`
  - `upsertMediaFile(input: { filename: string; mimeType: string; data: Uint8Array }): Promise<void>` (throws on size > cap)
  - `deleteMediaFile(filename: string): Promise<void>` (no-throw if missing)
  - `getMediaFile(filename: string): Promise<StoredMediaFile | null>`

- [ ] **Step 1: Write the failing tests**

`lib/__tests__/media-mime.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mimeTypeForFilename } from '@/lib/media-mime';

describe('mimeTypeForFilename', () => {
  it('should map known image extensions case-insensitively', () => {
    expect(mimeTypeForFilename('photo.JPG')).toBe('image/jpeg');
    expect(mimeTypeForFilename('anim.webp')).toBe('image/webp');
  });

  it('should return octet-stream when extension is unknown or missing', () => {
    expect(mimeTypeForFilename('archive.xyz')).toBe('application/octet-stream');
    expect(mimeTypeForFilename('noextension')).toBe('application/octet-stream');
  });
});
```

`lib/__tests__/media-file-store.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const upsert = vi.fn();
const deleteMany = vi.fn();
const findUnique = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: { mediaFile: { upsert, deleteMany, findUnique } },
}));

import {
  MAX_MEDIA_FILE_BYTES,
  deleteMediaFile,
  getMediaFile,
  upsertMediaFile,
} from '@/lib/media-file-store';

describe('upsertMediaFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should upsert filename, mime type, size and bytes', async () => {
    const data = new Uint8Array([1, 2, 3]);
    await upsertMediaFile({ filename: 'a.jpg', mimeType: 'image/jpeg', data });
    expect(upsert).toHaveBeenCalledWith({
      where: { filename: 'a.jpg' },
      create: { filename: 'a.jpg', mimeType: 'image/jpeg', size: 3, data },
      update: { mimeType: 'image/jpeg', size: 3, data },
    });
  });

  it('should throw without writing when file exceeds the size cap', async () => {
    const data = new Uint8Array(MAX_MEDIA_FILE_BYTES + 1);
    await expect(
      upsertMediaFile({ filename: 'big.mp4', mimeType: 'video/mp4', data }),
    ).rejects.toThrow(/caps files/);
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe('deleteMediaFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should delete by filename via deleteMany so missing rows do not throw', async () => {
    await deleteMediaFile('a.jpg');
    expect(deleteMany).toHaveBeenCalledWith({ where: { filename: 'a.jpg' } });
  });
});

describe('getMediaFile', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return null when no row exists', async () => {
    findUnique.mockResolvedValue(null);
    await expect(getMediaFile('missing.jpg')).resolves.toBeNull();
  });

  it('should map the row to a StoredMediaFile', async () => {
    const data = new Uint8Array([9]);
    findUnique.mockResolvedValue({
      filename: 'a.jpg',
      mimeType: 'image/jpeg',
      size: 1,
      data,
      updatedAt: new Date(),
    });
    await expect(getMediaFile('a.jpg')).resolves.toEqual({
      filename: 'a.jpg',
      mimeType: 'image/jpeg',
      size: 1,
      data,
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node_modules/.bin/vitest run lib/__tests__/media-file-store.test.ts lib/__tests__/media-mime.test.ts`
Expected: FAIL — cannot resolve `@/lib/media-file-store` / `@/lib/media-mime`.

- [ ] **Step 3: Implement**

`lib/media-mime.ts`:

```ts
// lib/media-mime.ts
// Extension → MIME map shared by the /media route and the media import script.
export const MIME_BY_EXT: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp',
};

export function mimeTypeForFilename(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const ext = dot === -1 ? '' : filename.slice(dot).toLowerCase();
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}
```

`lib/media-file-store.ts`:

```ts
// lib/media-file-store.ts
// Postgres-backed binary store for Payload media uploads. The shared DB is the
// source of truth for media bytes; Payload's `media` collection keeps metadata.
//
// This module is reachable from payload.config.ts (via the storage adapter),
// which `payload generate:importmap` executes under plain tsx where importing
// 'server-only' throws. lib/prisma.ts imports 'server-only', so prisma must be
// imported lazily inside each function — never at module top level.

export const MAX_MEDIA_FILE_BYTES = 25 * 1024 * 1024;

export interface StoredMediaFile {
  filename: string;
  mimeType: string;
  size: number;
  data: Uint8Array;
}

async function db() {
  const { prisma } = await import('./prisma');
  return prisma;
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
  const prisma = await db();
  await prisma.mediaFile.upsert({
    where: { filename: input.filename },
    create: {
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.data.byteLength,
      data: input.data,
    },
    update: {
      mimeType: input.mimeType,
      size: input.data.byteLength,
      data: input.data,
    },
  });
}

export async function deleteMediaFile(filename: string): Promise<void> {
  const prisma = await db();
  await prisma.mediaFile.deleteMany({ where: { filename } });
}

export async function getMediaFile(filename: string): Promise<StoredMediaFile | null> {
  const prisma = await db();
  const row = await prisma.mediaFile.findUnique({ where: { filename } });
  if (!row) return null;
  return { filename: row.filename, mimeType: row.mimeType, size: row.size, data: row.data };
}
```

If Prisma 7's generated type for `data` is not assignable from `Uint8Array` (it should be — `Bytes` ⇄ `Uint8Array` since Prisma 6), fix the store's types to match the generated client rather than casting.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node_modules/.bin/vitest run lib/__tests__/media-file-store.test.ts lib/__tests__/media-mime.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/media-mime.ts lib/media-file-store.ts lib/__tests__/media-file-store.test.ts lib/__tests__/media-mime.test.ts
git commit -m "feat(media): add postgres media file store and shared mime map

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Payload storage adapter + plugin wiring

**Files:**
- Create: `src/payload/storage/postgres-adapter.ts`
- Modify: `src/payload/plugins.ts` (add import + plugin entry at end of `shopnexPlugins` array)

**Interfaces:**
- Consumes: `upsertMediaFile`, `deleteMediaFile`, `getMediaFile` from `@/lib/media-file-store`.
- Produces: `postgresStorageAdapter(): Adapter` wired into `cloudStoragePlugin` for the `media` collection. Payload stops writing uploads to `public/media`; `doc.url` becomes `/media/<filename>` via `generateURL`.

- [ ] **Step 1: Install the plugin package (version-locked to the payload release)**

Run: `pnpm add @payloadcms/plugin-cloud-storage@3.84.1`
Expected: added to `dependencies` in `package.json`.

- [ ] **Step 2: Create the adapter**

`src/payload/storage/postgres-adapter.ts`:

```ts
// src/payload/storage/postgres-adapter.ts
// Payload storage adapter that keeps media binaries in the shared Postgres DB
// (MediaFile table) instead of the host filesystem, so every machine pointing
// at the same DB serves the same images. Public serving happens through
// app/media/[...path]/route.ts; staticHandler below only backs Payload's own
// /api/media/file/:filename admin path.
import type { Adapter, GeneratedAdapter } from '@payloadcms/plugin-cloud-storage/types';
import { deleteMediaFile, getMediaFile, upsertMediaFile } from '@/lib/media-file-store';

export const postgresStorageAdapter = (): Adapter => {
  return (): GeneratedAdapter => ({
    name: 'postgres-media',
    handleUpload: async ({ file }) => {
      await upsertMediaFile({
        filename: file.filename,
        mimeType: file.mimeType,
        data: file.buffer,
      });
    },
    handleDelete: async ({ filename }) => {
      await deleteMediaFile(filename);
    },
    generateURL: ({ filename }) => `/media/${filename}`,
    staticHandler: async (_req, { params }) => {
      const stored = await getMediaFile(params.filename);
      if (!stored) return new Response(null, { status: 404 });
      return new Response(Buffer.from(stored.data), {
        headers: {
          'Content-Type': stored.mimeType,
          'Content-Length': String(stored.size),
          'Cache-Control': 'public, max-age=86400',
        },
      });
    },
  });
};
```

Adjust signatures to the actual types exported by `@payloadcms/plugin-cloud-storage/types` (check `node_modules/@payloadcms/plugin-cloud-storage/dist/types.d.ts`) — the shapes above match the 3.x adapter contract (`handleUpload({ file })` with `file.buffer: Buffer`, `handleDelete({ filename })`, `staticHandler(req, { params: { filename } })`), but field names must compile against the real declaration file, not from memory.

- [ ] **Step 3: Wire the plugin into `src/payload/plugins.ts`**

Add imports at the top with the other plugin imports:

```ts
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage';
import { postgresStorageAdapter } from './storage/postgres-adapter';
```

Add as the last entry of the `shopnexPlugins` array (before the closing `];`):

```ts
  cloudStoragePlugin({
    collections: {
      media: {
        adapter: postgresStorageAdapter(),
        disableLocalStorage: true,
      },
    },
  }),
```

- [ ] **Step 4: Verify config still loads outside Next (server-only guard)**

Run: `node_modules/.bin/payload generate:importmap`
Expected: completes without error. An error mentioning `server-only` means a static prisma import leaked into the config graph — fix the import to be lazy, do not remove the guard from `lib/prisma.ts`.

- [ ] **Step 5: Verify types + full test suite**

Run: `node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/payload/storage/postgres-adapter.ts src/payload/plugins.ts
git commit -m "feat(media): store payload uploads in postgres via custom storage adapter

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `/media` route serves DB-first with disk fallback (TDD)

**Files:**
- Modify: `app/media/[...path]/route.ts` (full rewrite below)
- Test: `app/media/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `getMediaFile` from `@/lib/media-file-store`, `mimeTypeForFilename` from `@/lib/media-mime`, `logger` from `@/lib/logger`.
- Produces: unchanged public contract — `GET /media/<filename>` → 200 with bytes, 404 when unknown; NEW: 500 on DB error (logged, not masked).

- [ ] **Step 1: Write the failing tests**

`app/media/__tests__/route.test.ts`:

```ts
import { Readable } from 'node:stream';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getMediaFile = vi.fn();
const existsSync = vi.fn();
const statMock = vi.fn();
const createReadStream = vi.fn();
const logError = vi.fn();

vi.mock('@/lib/media-file-store', () => ({
  getMediaFile: (...args: unknown[]) => getMediaFile(...args),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: (...args: unknown[]) => logError(...args) },
}));
vi.mock('node:fs', () => ({
  existsSync: (...args: unknown[]) => existsSync(...args),
  createReadStream: (...args: unknown[]) => createReadStream(...args),
}));
vi.mock('node:fs/promises', () => ({
  stat: (...args: unknown[]) => statMock(...args),
}));

import { GET } from '../[...path]/route';

function call(segments: string[]) {
  const request = new NextRequest('http://localhost/media/test');
  return GET(request, { params: Promise.resolve({ path: segments }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  existsSync.mockReturnValue(false);
});

describe('GET /media/[...path]', () => {
  it('should serve the file from the database when a row exists', async () => {
    getMediaFile.mockResolvedValue({
      filename: 'a.jpg',
      mimeType: 'image/jpeg',
      size: 3,
      data: new Uint8Array([1, 2, 3]),
    });

    const res = await call(['a.jpg']);

    expect(getMediaFile).toHaveBeenCalledWith('a.jpg');
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    expect(res.headers.get('Content-Length')).toBe('3');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=86400');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('should decode url-encoded filenames before the database lookup', async () => {
    getMediaFile.mockResolvedValue(null);
    await call(['t%E1%BB%87p%20%E1%BA%A3nh.jpg']);
    expect(getMediaFile).toHaveBeenCalledWith('tệp ảnh.jpg');
  });

  it('should fall back to disk when no database row exists', async () => {
    getMediaFile.mockResolvedValue(null);
    existsSync.mockReturnValue(true);
    statMock.mockResolvedValue({ isFile: () => true, size: 2 });
    createReadStream.mockReturnValue(Readable.from(Buffer.from([7, 8])));

    const res = await call(['legacy.png']);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([7, 8]));
  });

  it('should return 404 when neither database nor disk has the file', async () => {
    getMediaFile.mockResolvedValue(null);
    const res = await call(['missing.jpg']);
    expect(res.status).toBe(404);
  });

  it('should return 500 and log when the database lookup fails', async () => {
    getMediaFile.mockRejectedValue(new Error('connection refused'));
    const res = await call(['a.jpg']);
    expect(res.status).toBe(500);
    expect(logError).toHaveBeenCalled();
  });

  it('should return 404 for path traversal attempts', async () => {
    getMediaFile.mockResolvedValue(null);
    const res = await call(['..', '.env']);
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node_modules/.bin/vitest run app/media/__tests__/route.test.ts`
Expected: FAIL — DB-serving tests fail (current route only reads disk); fallback/404 tests may pass.

- [ ] **Step 3: Rewrite the route**

`app/media/[...path]/route.ts` (full file):

```ts
// app/media/[...path]/route.ts
// Serve Payload upload files at runtime: database first (the shared Postgres
// is the source of truth for media binaries — see
// docs/superpowers/specs/2026-07-15-db-media-storage-design.md), falling back
// to public/media on disk for files that predate DB storage.
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getMediaFile } from '@/lib/media-file-store';
import { mimeTypeForFilename } from '@/lib/media-mime';

export const dynamic = 'force-dynamic';

const MEDIA_ROOT = path.resolve(process.cwd(), 'public', 'media');
const CACHE_CONTROL = 'public, max-age=86400';

function resolveMediaPath(segments: string[]): string | null {
  if (segments.length === 0) return null;

  const decoded = segments.map((segment) => decodeURIComponent(segment));
  const resolved = path.resolve(MEDIA_ROOT, ...decoded);
  const relative = path.relative(MEDIA_ROOT, resolved);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return resolved;
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  const { path: segments } = await context.params;
  if (segments.length === 0) {
    return new NextResponse(null, { status: 404 });
  }

  const filename = segments.map((segment) => decodeURIComponent(segment)).join('/');

  try {
    const stored = await getMediaFile(filename);
    if (stored) {
      return new NextResponse(Buffer.from(stored.data), {
        headers: {
          'Content-Type': stored.mimeType,
          'Content-Length': String(stored.size),
          'Cache-Control': CACHE_CONTROL,
        },
      });
    }
  } catch (error) {
    logger.error({ err: error, filename, route: '/media' }, 'media database lookup failed');
    return new NextResponse(null, { status: 500 });
  }

  const filePath = resolveMediaPath(segments);
  if (!filePath || !existsSync(filePath)) {
    return new NextResponse(null, { status: 404 });
  }

  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    return new NextResponse(null, { status: 404 });
  }

  const stream = createReadStream(filePath);

  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': mimeTypeForFilename(filePath),
      'Content-Length': String(fileStat.size),
      'Cache-Control': CACHE_CONTROL,
    },
  });
}
```

(The local `MIME_BY_EXT` map is replaced by `mimeTypeForFilename` from Task 2 — same mappings plus mp4/webm.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `node_modules/.bin/vitest run app/media/__tests__/route.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Run full suite + types**

Run: `node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run`
Expected: both pass.

- [ ] **Step 6: Commit**

```bash
git add app/media
git commit -m "feat(media): serve /media from database with disk fallback

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: One-time import script + run against the shared DB

**Files:**
- Create: `scripts/import-media-to-db.ts`

**Interfaces:**
- Consumes: `upsertMediaFile`, `MAX_MEDIA_FILE_BYTES` from `@/lib/media-file-store`; `mimeTypeForFilename` from `@/lib/media-mime`.
- Produces: all `public/media` files upserted into `MediaFile`. Idempotent — safe to re-run any time (e.g. after restoring an old disk backup).

- [ ] **Step 1: Write the script**

`scripts/import-media-to-db.ts`:

```ts
// scripts/import-media-to-db.ts
// One-time (idempotent, re-runnable) import of public/media files into the
// MediaFile table, making the shared Postgres DB the source of truth for
// media binaries. Files over MAX_MEDIA_FILE_BYTES are skipped with a warning.
//
// Run: node_modules/.bin/tsx scripts/import-media-to-db.ts
import 'dotenv/config';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { MAX_MEDIA_FILE_BYTES, upsertMediaFile } from '@/lib/media-file-store';
import { mimeTypeForFilename } from '@/lib/media-mime';

const MEDIA_ROOT = path.resolve(process.cwd(), 'public', 'media');

async function main() {
  const entries = await readdir(MEDIA_ROOT, { recursive: true, withFileTypes: true });
  let imported = 0;
  const skipped: string[] = [];

  for (const entry of entries) {
    if (!entry.isFile()) continue;

    const absolute = path.join(entry.parentPath, entry.name);
    // Key rows by the path relative to public/media (flat filenames today),
    // matching what the /media route looks up.
    const filename = path.relative(MEDIA_ROOT, absolute).split(path.sep).join('/');
    const data = await readFile(absolute);

    if (data.byteLength > MAX_MEDIA_FILE_BYTES) {
      skipped.push(`${filename} (${data.byteLength} bytes)`);
      continue;
    }

    await upsertMediaFile({
      filename,
      mimeType: mimeTypeForFilename(filename),
      data,
    });
    imported += 1;
  }

  const { prisma } = await import('@/lib/prisma');
  const total = await prisma.mediaFile.count();

  console.log(`imported/updated: ${imported}`);
  if (skipped.length > 0) {
    console.warn(`skipped (over size cap): ${skipped.length}`);
    for (const item of skipped) console.warn(`  - ${item}`);
  }
  console.log(`MediaFile rows in database: ${total}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

Note: `console.*` is fine here — this is a CLI script, not a production code path. `@/lib/prisma`'s `'server-only'` import throws under plain tsx **only when statically imported at load time in some setups** — if `import 'dotenv/config'` + lazy prisma still hits the `server-only` guard when running this script, replace the count block with a second lazy call pattern identical to `lib/media-file-store.ts` (which is already lazy). If `server-only` throws regardless under tsx, drop the count block and verify the row count via Step 3's SQL instead.

- [ ] **Step 2: Run the import twice (idempotency check)**

Run: `node_modules/.bin/tsx scripts/import-media-to-db.ts`
Expected: `imported/updated: 715`, `MediaFile rows in database: 715`, no skips.

Run it again: same numbers (upserts, no duplicates, no errors).

- [ ] **Step 3: Verify a sample row directly**

Run: `node_modules/.bin/tsx -e "import 'dotenv/config'; (async () => { const { PrismaClient } = await import('./generated/prisma/client'); const { PrismaPg } = await import('@prisma/adapter-pg'); const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) }); const row = await prisma.mediaFile.findFirst({ select: { filename: true, mimeType: true, size: true } }); console.log(row); await prisma.\$disconnect(); })()"`
Expected: prints one row with a real filename, image mime type, and nonzero size.

- [ ] **Step 4: Commit**

```bash
git add scripts/import-media-to-db.ts
git commit -m "feat(media): add idempotent public/media to database import script

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: End-to-end verification + docs

**Files:**
- Modify: `CLAUDE.md` (one paragraph in the Dual-Database Architecture section)
- Scratchpad only (not committed): an upload/delete e2e script

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: verified working system; updated architecture docs.

- [ ] **Step 1: Prove DB serving with the disk directory out of the way**

Start the dev server in the background (`node_modules/.bin/next dev --turbo`), wait for ready, then:

```bash
mv public/media public/media.hold
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" "http://localhost:3000/media/do-choi-minecraft-block-set.jpg"
mv public/media.hold public/media
```

Expected: `200 image/jpeg` **while the disk directory is absent** — bytes came from the DB. Restore the directory immediately regardless of outcome.

- [ ] **Step 2: E2E upload + delete through Payload (local API)**

Write to the scratchpad (not the repo) an e2e script and run it with `node_modules/.bin/tsx`:

```ts
import 'dotenv/config';
import { getPayload } from 'payload';
import config from '@payload-config';

async function main() {
  const payload = await getPayload({ config });

  // 1×1 transparent PNG
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  const doc = await payload.create({
    collection: 'media',
    data: { alt: 'db-storage e2e test' },
    file: { data: png, mimetype: 'image/png', name: 'db-storage-e2e-test.png', size: png.length },
  });
  console.log('created:', doc.filename, 'url:', doc.url);

  const { prisma } = await import('@/lib/prisma');
  const row = await prisma.mediaFile.findUnique({ where: { filename: String(doc.filename) } });
  console.log('MediaFile row exists:', row !== null, 'size:', row?.size);

  await payload.delete({ collection: 'media', id: doc.id });
  const afterDelete = await prisma.mediaFile.findUnique({
    where: { filename: String(doc.filename) },
  });
  console.log('row after delete (want null):', afterDelete);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

Expected output: `MediaFile row exists: true` with size > 0, and `row after delete (want null): null`. Also confirm `doc.url` is `/media/db-storage-e2e-test.png` (generateURL working) and that NO file named `db-storage-e2e-test.png` appeared in `public/media` (local storage disabled). If tsx path-alias or `server-only` issues block running this via tsx, run it through the dev server context instead (e.g. a temporary API route in the scratchpad pattern is NOT acceptable — instead adapt imports to relative paths); report if blocked after two attempts.

- [ ] **Step 3: Full suite, types, importmap — final gate**

Run: `node_modules/.bin/tsc --noEmit && node_modules/.bin/vitest run && node_modules/.bin/payload generate:importmap`
Expected: all pass, importmap diff (if any) contains only generated changes — commit them if present.

- [ ] **Step 4: Update `CLAUDE.md`**

In the "2. Prisma Schema" list under Dual-Database Architecture, add:

```markdown
* Media Files — binary bytes of Payload media uploads (`MediaFile` table; Payload's `media` collection keeps only metadata). Uploads write via a custom storage adapter (`src/payload/storage/postgres-adapter.ts`); serving is DB-first with `public/media` disk fallback in `app/media/[...path]/route.ts`.
```

- [ ] **Step 5: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: document db-backed media storage in architecture overview

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 6: Report follow-ups to the user (do NOT implement)**

Out of scope per spec, surface as decisions for the user:
1. Remove the `./public/media:/app/public/media` bind mount from `docker-compose.yml` (gitignored — user edits it) once DB serving is confirmed on the other machine.
2. Optionally un-track `public/media` from git later (keeps repo slim; disk fallback then only matters for dev).
3. The other machine needs the new app image (rebuild + pull) — the DB alone now carries the images, but the serving code must be deployed there.
