// lib/reel-embed.ts — pure URL→embed conversion for the reel carousel. Kept
// separate from the client component so it can be unit-tested without a DOM and
// reused server-side if needed.
export type ReelPlatform = 'youtube' | 'tiktok' | 'facebook';

/**
 * Extract the YouTube video/short id from any of its URL shapes
 * (watch?v=, youtu.be/, shorts/, embed/, live/, /v/). Returns null when the
 * URL isn't a recognizable YouTube link.
 */
export function youtubeIdFromUrl(rawUrl: string): string | null {
  const m = rawUrl
    .trim()
    .match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([\w-]+)/,
    );
  return m?.[1] ?? null;
}

/**
 * Build a poster image URL for a YouTube link so blocks can show a thumbnail
 * without a hand-uploaded cover. `hqdefault.jpg` (the default) always exists for
 * a valid id; `maxresdefault.jpg` is far sharper but 404s for videos that lack a
 * hi-res source — callers that request 'max' should fall back to 'hq' on error.
 * Returns null for non-YouTube URLs.
 */
export function youtubeThumbnail(rawUrl: string, quality: 'hq' | 'max' = 'hq'): string | null {
  const id = youtubeIdFromUrl(rawUrl);
  if (!id) return null;
  const file = quality === 'max' ? 'maxresdefault' : 'hqdefault';
  return `https://i.ytimg.com/vi/${id}/${file}.jpg`;
}

/**
 * Build the platform-specific iframe src for a reel URL. Returns null when the
 * URL can't be parsed into an embeddable form for its platform (YouTube/TikTok).
 * Facebook has no clean ID form across reels/watch/video URLs, so the whole URL
 * is handed to the video plugin, which resolves it — hence it never returns null.
 */
export function toReelEmbedSrc(platform: ReelPlatform, rawUrl: string): string | null {
  const url = rawUrl.trim();
  if (!url) return null;

  switch (platform) {
    case 'youtube': {
      const id = youtubeIdFromUrl(url);
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
    }
    case 'tiktok': {
      const tt = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|v\/|embed\/v2\/)?(\d{6,})/);
      return tt?.[1] ? `https://www.tiktok.com/embed/v2/${tt[1]}` : null;
    }
    case 'facebook':
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&autoplay=1&show_text=false`;
    default:
      return null;
  }
}
