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
