// src/payload/collections/Media.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  CollectionAfterReadHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
} from 'payload';
import { payloadPublicReadAdminWrite } from '@/lib/payload-access';
import {
  loadMediaDoc,
  mediaDocToStored,
  normalizeProductImageUrl,
  resolveMediaId,
  type StoredImage,
} from '@/lib/product-image-snapshot';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

function hasStoredUrl(stored: unknown): boolean {
  return (
    typeof stored === 'object' &&
    stored !== null &&
    'url' in stored &&
    typeof (stored as { url?: unknown }).url === 'string' &&
    (stored as { url: string }).url.trim().length > 0
  );
}

function appendStoredIfMissing(list: StoredImage[], next: StoredImage | null): StoredImage[] {
  if (!next?.url) return list;
  if (list.some((item) => item.url === next.url)) return list;
  return [...list, next];
}

/** Detach product FKs and ensure snapshots exist before media row is deleted. */
const detachMediaFromProducts: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const media = await loadMediaDoc(req.payload, id);
  const fallbackAlt = typeof media?.filename === 'string' ? media.filename : 'Product';
  const snapshot = mediaDocToStored(media, fallbackAlt);

  const withPrimary = await req.payload.find({
    collection: 'products',
    where: { image: { equals: id } },
    limit: 200,
    pagination: false,
    overrideAccess: true,
    depth: 1,
  });

  for (const product of withPrimary.docs) {
    const title = typeof product.title === 'string' ? product.title : fallbackAlt;
    const snap = snapshot ?? mediaDocToStored(media, title);
    const data: Record<string, unknown> = { image: null };

    if (!hasStoredUrl(product.storedImage) && snap) {
      data.storedImage = snap;
    }

    await req.payload.update({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
      data,
    });
  }

  const withGallery = await req.payload.find({
    collection: 'products',
    where: { 'gallery.media': { equals: id } },
    limit: 200,
    pagination: false,
    overrideAccess: true,
    depth: 1,
  });

  for (const product of withGallery.docs) {
    const title = typeof product.title === 'string' ? product.title : fallbackAlt;
    let storedGallery = Array.isArray(product.storedGallery)
      ? [...(product.storedGallery as StoredImage[])]
      : [];

    const gallery = Array.isArray(product.gallery) ? product.gallery : [];

    for (const item of gallery) {
      if (!item || typeof item !== 'object') continue;

      const mediaId = resolveMediaId((item as { media?: unknown }).media);
      if (mediaId === null || String(mediaId) !== String(id)) continue;

      const itemMedia =
        typeof (item as { media?: unknown }).media === 'object'
          ? ((item as { media: unknown }).media as Parameters<typeof mediaDocToStored>[0])
          : media;
      storedGallery = appendStoredIfMissing(storedGallery, mediaDocToStored(itemMedia, title));
    }

    const updatedGallery = gallery.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const mediaId = resolveMediaId((item as { media?: unknown }).media);
      return mediaId === null || String(mediaId) !== String(id);
    });

    await req.payload.update({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
      data: {
        gallery: updatedGallery,
        storedGallery,
      },
    });
  }

  const withSeoImage = await req.payload.find({
    collection: 'products',
    where: { 'meta.image': { equals: id } },
    limit: 200,
    pagination: false,
    overrideAccess: true,
    depth: 0,
  });

  for (const product of withSeoImage.docs) {
    await req.payload.update({
      collection: 'products',
      id: product.id,
      overrideAccess: true,
      data: {
        meta: {
          image: null,
        },
      },
    });
  }
};

/**
 * Rewrite Payload's absolute `url` (built from serverURL, e.g.
 * `http://192.168.1.3:3000/admin/api/media/file/foo.jpg`) to the host-relative
 * public path (`/media/foo.jpg`). The admin renders `doc.url` directly in an
 * `<img>`, so an absolute URL freezes it to whatever host the server booted with
 * (a stale LAN IP hangs forever). Relative URLs resolve against the browser's
 * current origin — localhost, any LAN IP, any future DHCP address — with no
 * rebuild. The storefront already normalizes this same way; SEO re-absolutizes
 * via `absoluteUrl()`, so nothing that needs an absolute URL is affected.
 */
const relativizeMediaUrl: CollectionAfterReadHook = ({ doc }) => {
  if (doc && typeof doc.url === 'string' && doc.url.trim().length > 0) {
    doc.url = normalizeProductImageUrl(doc.url);
  }
  // Payload also emits `thumbnailURL` (the admin list/grid preview src) as an
  // absolute URL off serverURL — relativize it too or the media grid hangs.
  if (doc && typeof doc.thumbnailURL === 'string' && doc.thumbnailURL.trim().length > 0) {
    doc.thumbnailURL = normalizeProductImageUrl(doc.thumbnailURL);
  }
  return doc;
};

export const Media: CollectionConfig = {
  slug: 'media',
  access: payloadPublicReadAdminWrite,
  admin: {
    useAsTitle: 'filename',
  },
  hooks: {
    afterRead: [relativizeMediaUrl],
    beforeDelete: [detachMediaFromProducts],
  },
  upload: {
    staticDir: path.resolve(dirname, '../../../public/media'),
    mimeTypes: ['image/*', 'video/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
};
