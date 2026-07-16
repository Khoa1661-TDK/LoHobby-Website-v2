// app/media/[...path]/route.ts
// Serve Payload upload files: from public/media when the file exists on disk,
// otherwise from the Postgres media store (MediaFile table).
//
// The postgres storage adapter (src/payload/storage/postgres-adapter.ts) writes
// upload binaries to the DB, not the filesystem, so on a fresh deploy the disk
// is empty and the DB is the only source. Disk is still checked first for
// legacy files that predate the adapter.
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getMediaFile } from '@/lib/media-file-store';

export const dynamic = 'force-dynamic';

const MEDIA_ROOT = path.resolve(process.cwd(), 'public', 'media');

const MIME_BY_EXT: Record<string, string> = {
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

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

async function serveFromStore(segments: string[]): Promise<Response> {
  const filename = segments.map((segment) => decodeURIComponent(segment)).join('/');
  const stored = await getMediaFile(filename);

  if (!stored) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(Buffer.from(stored.data), {
    headers: {
      'Content-Type': stored.mimeType,
      'Content-Length': String(stored.size),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  const { path: segments } = await context.params;
  const filePath = resolveMediaPath(segments);

  if (!filePath || !existsSync(filePath)) {
    return serveFromStore(segments);
  }

  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    return serveFromStore(segments);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_BY_EXT[ext] ?? 'application/octet-stream';
  const stream = createReadStream(filePath);

  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(fileStat.size),
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
