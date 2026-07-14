// lib/youtube-stats.ts — server-side YouTube channel stats via the YouTube Data
// API v3. Resolves either a raw channel ID (UC…) or an @handle / legacy username
// to snippet + statistics, cached ~1h. When YOUTUBE_API_KEY is unset or the fetch
// fails, returns null so callers can fall back to editor-entered manual values.
import { unstable_cache } from 'next/cache';

export type YouTubeChannelStats = {
  channelId: string;
  title: string;
  avatarUrl: string | null;
  subscriberCount: number | null;
  viewCount: number | null;
  videoCount: number | null;
  /** Whether the channel hides its subscriber count publicly. */
  subscriberHidden: boolean;
};

const API_BASE = 'https://www.googleapis.com/youtube/v3/channels';
// Refetch stats at most once an hour — subscriber/view counts drift slowly and the
// Data API has a daily quota, so there's no value in hammering it per request.
const REVALIDATE_SECONDS = 60 * 60;

type ApiThumbnail = { url?: string };
type ApiItem = {
  id?: string;
  snippet?: {
    title?: string;
    thumbnails?: { default?: ApiThumbnail; medium?: ApiThumbnail; high?: ApiThumbnail };
  };
  statistics?: {
    viewCount?: string;
    subscriberCount?: string;
    hiddenSubscriberCount?: boolean;
    videoCount?: string;
  };
};

/** Parse a numeric string from the API into a finite number, or null. */
function toNumber(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Turn an editor-entered identifier into the right API query param. Accepts:
 *  - a full URL (youtube.com/channel/UC…, /@handle, /c/name, /user/name)
 *  - a bare channel ID (UC…, 24 chars)
 *  - a bare @handle or handle
 *  - a legacy username
 */
export function resolveQueryParam(rawInput: string): {
  key: 'id' | 'forHandle' | 'forUsername';
  value: string;
} {
  let input = rawInput.trim();

  // Pull the meaningful segment out of a pasted channel URL.
  const urlMatch = input.match(/youtube\.com\/(channel\/|c\/|user\/|@)?([^/?#\s]+)/i);
  if (urlMatch?.[2]) {
    const prefix = urlMatch[1] ?? '';
    const segment = urlMatch[2];
    if (/^channel\//i.test(prefix)) return { key: 'id', value: segment };
    if (/^user\//i.test(prefix)) return { key: 'forUsername', value: segment };
    if (prefix === '@') return { key: 'forHandle', value: `@${segment}` };
    // /c/name vanity URLs resolve as handles on the modern API.
    input = segment;
  }

  if (/^UC[\w-]{20,}$/.test(input)) return { key: 'id', value: input };
  if (input.startsWith('@')) return { key: 'forHandle', value: input };
  return { key: 'forHandle', value: `@${input}` };
}

async function fetchChannelStats(identifier: string): Promise<YouTubeChannelStats | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const trimmed = identifier.trim();
  if (!trimmed) return null;

  const { key, value } = resolveQueryParam(trimmed);
  const url = `${API_BASE}?part=snippet,statistics&${key}=${encodeURIComponent(value)}&key=${apiKey}`;

  try {
    const res = await fetch(url, {
      // unstable_cache handles our own caching layer; keep fetch itself uncached.
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { items?: ApiItem[] };
    const item = data.items?.[0];
    if (!item) return null;

    const thumbs = item.snippet?.thumbnails;
    const avatarUrl = thumbs?.medium?.url ?? thumbs?.high?.url ?? thumbs?.default?.url ?? null;

    return {
      channelId: item.id ?? value,
      title: item.snippet?.title ?? '',
      avatarUrl,
      subscriberCount: toNumber(item.statistics?.subscriberCount),
      viewCount: toNumber(item.statistics?.viewCount),
      videoCount: toNumber(item.statistics?.videoCount),
      subscriberHidden: item.statistics?.hiddenSubscriberCount === true,
    };
  } catch {
    // Network error / quota exceeded / malformed response — fall back to manual values.
    return null;
  }
}

/**
 * Cached channel-stats lookup. Returns null when the API key is missing or the
 * channel can't be resolved; the block then renders editor-entered fallbacks.
 */
export async function getYouTubeChannelStats(
  identifier: string,
): Promise<YouTubeChannelStats | null> {
  const trimmed = identifier?.trim();
  if (!trimmed) return null;
  return unstable_cache(
    () => fetchChannelStats(trimmed),
    ['youtube-channel-stats', trimmed],
    { revalidate: REVALIDATE_SECONDS, tags: ['youtube-channel'] },
  )();
}

/** Format a large count as compact shorthand (e.g. 1_234_567 → "1.2M"). */
export function formatCompactCount(value: number, locale = 'en'): string {
  try {
    return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
      value,
    );
  } catch {
    return String(value);
  }
}
