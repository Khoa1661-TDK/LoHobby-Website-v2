// lib/product-image-snapshot.ts — denormalized product images (decoupled from media library)

export type StoredImage = {
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

type MediaLike = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  filename?: string | null;
};

export function normalizeProductImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '/images/placeholder.svg';

  const adminMatch = trimmed.match(/\/admin\/api\/media\/file\/([^/?#]+)/);
  if (adminMatch?.[1]) {
    return `/media/${adminMatch[1]}`;
  }

  return trimmed;
}

export function mediaDocToStored(
  media: MediaLike | null | undefined,
  fallbackAlt: string,
): StoredImage | null {
  if (!media?.url?.trim()) return null;

  return {
    url: normalizeProductImageUrl(media.url),
    alt: media.alt?.trim() || fallbackAlt,
    width: media.width ?? 1200,
    height: media.height ?? 1200,
  };
}

export function resolveMediaId(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return id;
  }
  return null;
}

export async function loadMediaDoc(
  payload: { findByID: (args: { collection: 'media'; id: string | number; overrideAccess?: boolean }) => Promise<unknown> },
  value: unknown,
): Promise<MediaLike | null> {
  if (value && typeof value === 'object' && 'url' in value) {
    return value as MediaLike;
  }

  const id = resolveMediaId(value);
  if (id === null) return null;

  try {
    const doc = await payload.findByID({
      collection: 'media',
      id,
      overrideAccess: true,
    });
    return doc && typeof doc === 'object' ? (doc as MediaLike) : null;
  } catch {
    return null;
  }
}
