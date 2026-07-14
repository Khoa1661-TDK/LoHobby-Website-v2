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
  // Prisma 7 types Bytes as Uint8Array<ArrayBuffer>; copy once so Buffer-backed
  // inputs (ArrayBufferLike) satisfy it without casting. Inputs are ≤ 25 MB.
  const bytes = new Uint8Array(input.data);
  const prisma = await db();
  await prisma.mediaFile.upsert({
    where: { filename: input.filename },
    create: {
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.data.byteLength,
      data: bytes,
    },
    update: {
      mimeType: input.mimeType,
      size: input.data.byteLength,
      data: bytes,
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
