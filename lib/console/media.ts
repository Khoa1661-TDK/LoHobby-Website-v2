// lib/console/media.ts
//
// Media adapter for the admin console: a pure mapper over Payload media
// documents, plus a thin reader that lists the most recent uploads.

import config from '@payload-config';
import { getPayload } from 'payload';
import type { Media } from '@/src/payload/payload-types';
import type { MediaItem } from '@/components/console/media/MediaGrid';

export function toMediaItem(doc: Media): MediaItem {
  const kind: MediaItem['kind'] = String(doc.mimeType ?? '').startsWith('video/')
    ? 'video'
    : 'image';
  const url = doc.thumbnailURL || doc.url || null;
  const alt = doc.alt || doc.filename || '';
  return {
    id: String(doc.id),
    kind,
    url,
    alt,
  };
}

export async function listMediaItems(limit = 60): Promise<MediaItem[]> {
  const payload = await getPayload({ config });
  const docs = await payload.find({
    collection: 'media',
    sort: '-createdAt',
    limit,
    depth: 0,
  });
  return docs.docs.map(toMediaItem);
}
