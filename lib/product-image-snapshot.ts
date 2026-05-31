// lib/product-image-snapshot.ts — denormalized product images (decoupled from media library)

export type MediaKind = 'image' | 'video';

export type StoredImage = {
  url: string;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  kind?: MediaKind | null;
};

type MediaLike = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  filename?: string | null;
  mimeType?: string | null;
  updatedAt?: string | null;
};

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i;

export function mediaKindFromMime(mimeType: string | null | undefined): MediaKind | null {
  if (!mimeType?.trim()) return null;
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return null;
}

export function mediaKindFromUrl(url: string): MediaKind {
  const path = normalizeProductImageUrl(url).split('?')[0] ?? url;
  return VIDEO_EXT.test(path) ? 'video' : 'image';
}

export function resolveMediaKind(
  media: Pick<MediaLike, 'mimeType' | 'url'> | null | undefined,
  storedKind?: MediaKind | null,
): MediaKind {
  if (storedKind === 'video' || storedKind === 'image') return storedKind;
  const fromMime = mediaKindFromMime(media?.mimeType);
  if (fromMime) return fromMime;
  if (media?.url?.trim()) return mediaKindFromUrl(media.url);
  return 'image';
}

export function normalizeProductImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '/images/placeholder.svg';

  const adminMatch = trimmed.match(/\/admin\/api\/media\/file\/([^/?#]+)([^#]*)/);
  if (adminMatch?.[1]) {
    // Preserve any query (e.g. our `?v=` cache-buster) when rewriting the
    // Payload admin file URL to the public static path.
    return `/media/${adminMatch[1]}${adminMatch[2] ?? ''}`;
  }

  return trimmed;
}

/**
 * Normalize a product image URL for Next.js `<Image />`.
 * The optimizer reads local files by pathname; cache-buster query params (`?v=`)
 * on `/media/*` URLs can cause "received null" errors in production.
 */
export function toNextImageSrc(url: string): string {
  const normalized = normalizeProductImageUrl(url);
  if (normalized.startsWith('/media/')) {
    return normalized.split('?')[0] ?? normalized;
  }
  return normalized;
}

/** Public media URL for `<video src>` (keeps cache-buster query on `/media/*`). */
export function toVideoSrc(url: string): string {
  return normalizeProductImageUrl(url);
}

/** Compare image URLs ignoring cache-buster query params. */
export function sameImageUrl(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a?.trim() || !b?.trim()) return false;
  const strip = (url: string) => normalizeProductImageUrl(url).split('?')[0] ?? url;
  return strip(a) === strip(b);
}

/**
 * Short content version derived from the media's `updatedAt`. Appended to image
 * URLs as `?v=` so that replacing a file (which keeps the same filename/URL)
 * still produces a fresh URL — busting the Next.js image-optimizer and browser
 * caches so the storefront shows the new image instead of the stale one.
 */
function mediaVersion(media: MediaLike): string | null {
  const raw = media.updatedAt;
  if (!raw) return null;
  const ts = Date.parse(raw);
  if (!Number.isFinite(ts)) return null;
  return ts.toString(36);
}

function appendVersion(url: string, version: string | null): string {
  if (!version) return url;
  if (/[?&]v=/.test(url)) return url;
  return url.includes('?') ? `${url}&v=${version}` : `${url}?v=${version}`;
}

export function mediaDocToStored(
  media: MediaLike | null | undefined,
  fallbackAlt: string,
): StoredImage | null {
  if (!media?.url?.trim()) return null;

  const url = appendVersion(normalizeProductImageUrl(media.url), mediaVersion(media));

  return {
    url,
    alt: media.alt?.trim() || fallbackAlt,
    width: media.width ?? (resolveMediaKind(media) === 'video' ? 1920 : 1200),
    height: media.height ?? (resolveMediaKind(media) === 'video' ? 1080 : 1200),
    kind: resolveMediaKind(media),
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

/** Sorted media ids from a product gallery array (for change detection). */
export function galleryMediaIds(gallery: unknown): string[] {
  if (!Array.isArray(gallery)) return [];
  return gallery
    .map((item) => resolveMediaId((item as { media?: unknown } | null)?.media))
    .filter((id): id is string | number => id !== null)
    .map(String)
    .sort();
}

export function galleryMediaIdsEqual(a: unknown, b: unknown): boolean {
  const left = galleryMediaIds(a);
  const right = galleryMediaIds(b);
  if (left.length !== right.length) return false;
  return left.every((id, index) => id === right[index]);
}

export async function loadMediaDoc(
  payload: { findByID: (args: { collection: 'media'; id: string | number; overrideAccess?: boolean }) => Promise<unknown> },
  value: unknown,
): Promise<MediaLike | null> {
  if (value && typeof value === 'object' && 'url' in value) {
    const media = value as MediaLike;
    if (media.url?.trim()) return media;
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

/**
 * Single-attempt media read for admin autosaves (upload fields PATCH the parent doc).
 * Avoids multi-second retry loops that freeze the CMS while a file is still processing.
 */
export async function loadMediaDocForSnapshot(
  payload: Parameters<typeof loadMediaDoc>[0],
  value: unknown,
): Promise<MediaLike | null> {
  const doc = await loadMediaDoc(payload, value);
  return doc?.url?.trim() ? doc : null;
}

/** Retry media reads — use on explicit product save / media resync when URL may lag. */
export async function loadMediaDocWithRetry(
  payload: Parameters<typeof loadMediaDoc>[0],
  value: unknown,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<MediaLike | null> {
  const attempts = options.attempts ?? 4;
  const delayMs = options.delayMs ?? 250;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const doc = await loadMediaDoc(payload, value);
    if (doc?.url?.trim()) return doc;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
}
