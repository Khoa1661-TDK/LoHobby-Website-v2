// lib/product-snapshot-patch.ts — compute stored image fields for products (server-only)

import {
  loadMediaDocForSnapshot,
  loadMediaDocWithRetry,
  mediaDocToStored,
  resolveMediaId,
  sameImageUrl,
  type StoredImage,
} from '@/lib/product-image-snapshot';

type PayloadLike = Parameters<typeof loadMediaDocForSnapshot>[0];

type ProductLike = {
  title?: string | null;
  image?: unknown;
  storedImage?: StoredImage | null;
  gallery?: Array<{ media?: unknown } | null> | null;
  storedGallery?: StoredImage[] | null;
};

function storedImageEqual(
  a: StoredImage | null | undefined,
  b: StoredImage | null | undefined,
): boolean {
  if (!a?.url?.trim() && !b?.url?.trim()) return true;
  if (!a?.url?.trim() || !b?.url?.trim()) return false;
  return (
    sameImageUrl(a.url, b.url) &&
    (a.alt ?? '') === (b.alt ?? '') &&
    (a.kind ?? 'image') === (b.kind ?? 'image')
  );
}

function storedGalleryEqual(
  a: StoredImage[] | null | undefined,
  b: StoredImage[] | null | undefined,
): boolean {
  const left = Array.isArray(a) ? a : [];
  const right = Array.isArray(b) ? b : [];
  if (left.length !== right.length) return false;
  return left.every((item, index) => storedImageEqual(item, right[index]));
}

async function loadMediaForBackfill(
  payload: PayloadLike,
  value: unknown,
  useRetry: boolean,
): Promise<Awaited<ReturnType<typeof loadMediaDocForSnapshot>>> {
  if (useRetry) {
    return loadMediaDocWithRetry(payload, value, { attempts: 2, delayMs: 150 });
  }
  return loadMediaDocForSnapshot(payload, value);
}

/**
 * Build a partial product update with snapshotted media URLs (main image + gallery only).
 * Variant images use the live media relationship at storefront read depth.
 */
export async function buildProductSnapshotPatch(
  payload: PayloadLike,
  doc: ProductLike,
  options: { useRetry?: boolean } = {},
): Promise<Record<string, unknown> | null> {
  const useRetry = options.useRetry === true;
  const title = typeof doc.title === 'string' && doc.title.trim() ? doc.title.trim() : 'Product';
  const patch: Record<string, unknown> = {};

  const imageId = resolveMediaId(doc.image);
  if (imageId !== null) {
    const media = await loadMediaForBackfill(payload, doc.image, useRetry);
    const stored = mediaDocToStored(media, title);
    if (stored && !storedImageEqual(stored, doc.storedImage)) {
      patch.storedImage = stored;
    }
  } else if (doc.storedImage) {
    patch.storedImage = null;
  }

  const gallery = Array.isArray(doc.gallery) ? doc.gallery : [];
  const existingStored = Array.isArray(doc.storedGallery) ? doc.storedGallery : [];

  if (gallery.length === 0) {
    if (existingStored.length > 0) {
      patch.storedGallery = [];
    }
  } else {
    let gallerySnapshotsComplete = existingStored.length === gallery.length;
    if (gallerySnapshotsComplete) {
      for (let index = 0; index < gallery.length; index += 1) {
        const item = gallery[index];
        const prev = existingStored[index];
        if (!prev?.url?.trim()) {
          gallerySnapshotsComplete = false;
          break;
        }
        if (typeof item?.media === 'object' && item.media !== null && 'url' in item.media) {
          const liveUrl = (item.media as { url?: string }).url;
          if (!liveUrl?.trim() || !sameImageUrl(prev.url, liveUrl)) {
            gallerySnapshotsComplete = false;
            break;
          }
        } else if (resolveMediaId(item?.media) === null) {
          gallerySnapshotsComplete = false;
          break;
        }
      }
    }

    if (!gallerySnapshotsComplete) {
      const storedGallery: StoredImage[] = [];

      for (let index = 0; index < gallery.length; index += 1) {
        const item = gallery[index];
        if (!item || typeof item !== 'object') continue;

        const previous = existingStored[index];
        if (previous?.url?.trim() && typeof item.media === 'object' && item.media !== null) {
          const liveUrl =
            'url' in item.media && typeof (item.media as { url?: unknown }).url === 'string'
              ? (item.media as { url: string }).url
              : null;
          if (liveUrl && sameImageUrl(previous.url, liveUrl)) {
            storedGallery.push(previous);
            continue;
          }
        }

        const media = await loadMediaForBackfill(payload, item.media, useRetry);
        const stored = mediaDocToStored(media, title);
        if (stored) {
          storedGallery.push(stored);
        } else if (previous?.url?.trim()) {
          // Upload still processing — keep prior snapshot so we do not churn partial arrays.
          storedGallery.push(previous);
        }
      }

      const complete = storedGallery.length === gallery.length;
      if (complete && !storedGalleryEqual(storedGallery, doc.storedGallery)) {
        patch.storedGallery = storedGallery;
      }
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

/** Remove snapshotted fields from a product doc returned to the admin UI. */
export function omitSnapshotFieldsFromDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const next = { ...doc };
  delete next.storedImage;
  delete next.storedGallery;

  if (Array.isArray(next.variants)) {
    next.variants = next.variants.map((variant) => {
      if (!variant || typeof variant !== 'object') return variant;
      const row = { ...(variant as Record<string, unknown>) };
      delete row.storedImage;
      return row;
    });
  }

  return next;
}

/** Strip client-submitted snapshot fields so saves are driven only by upload relationships. */
export function stripIncomingSnapshotFields(data: Record<string, unknown>): void {
  delete data.storedImage;
  delete data.storedGallery;

  if (!Array.isArray(data.variants)) return;

  for (const variant of data.variants) {
    if (!variant || typeof variant !== 'object') continue;
    delete (variant as Record<string, unknown>).storedImage;
  }
}
