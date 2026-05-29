// app/media/[...path]/route.ts
// Serve Payload upload files from public/media at runtime.
//
// Next.js production can miss files uploaded after `next build`; this route reads
// from disk on every request so CMS uploads work without a rebuild/restart.
import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  const { path: segments } = await context.params;
  const filePath = resolveMediaPath(segments);

  if (!filePath || !existsSync(filePath)) {
    return new NextResponse(null, { status: 404 });
  }

  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) {
    return new NextResponse(null, { status: 404 });
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
