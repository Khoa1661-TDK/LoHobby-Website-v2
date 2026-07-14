// components/blocks/VideoEmbed.tsx — server block: header + a click-to-play video
// surface (client island). The iframe is mounted on click (see VideoEmbed.client),
// which mirrors the working ReelCarousel modal — eager, lazy-loaded embeds render
// YouTube's "Video unavailable" shell in some environments; click-to-mount doesn't.
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { youtubeIdFromUrl, youtubeThumbnail } from '@/lib/reel-embed';
import VideoEmbedPlayer from './VideoEmbed.client';

type Props = {
  title?: string | null;
  url?: string | null;
  aspectRatio?: '16/9' | '4/3' | '1/1' | null;
  coverImage?: { url?: string; alt?: string } | null;
} & BlockAppearance;

const ratioMap: Record<string, string> = {
  '16/9': 'aspect-video',
  '4/3': 'aspect-[4/3]',
  '1/1': 'aspect-square',
};

/**
 * Normalize a pasted video URL into an iframe-embeddable form. YouTube watch /
 * youtu.be / Shorts pages send X-Frame-Options and refuse to render in an iframe,
 * so they must be rewritten to the /embed/<id> path. Vimeo gets the player host.
 * Already-embeddable URLs (and anything unrecognized) pass through unchanged.
 */
function toEmbedSrc(raw: string): string {
  const url = raw.trim();

  // YouTube: watch?v=ID, youtu.be/ID, shorts/ID, live/ID, /v/ID, or /embed/ID.
  const ytId = youtubeIdFromUrl(url);
  if (ytId) return `https://www.youtube.com/embed/${ytId}`;

  // Vimeo: vimeo.com/ID (numeric) → player.vimeo.com/video/ID.
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return url;
}

export default async function VideoEmbedBlock(props: Props): Promise<ReactElement> {
  const { title, url, aspectRatio = '16/9', coverImage } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const ratioClass = ratioMap[aspectRatio ?? '16/9'] ?? 'aspect-video';
  const t = await getTranslations('product');

  // Auto-derive a poster from the YouTube id when no cover is uploaded: try the
  // hi-res maxres frame first, falling back client-side to hqdefault if a video
  // has no maxres source (see VideoEmbed.client).
  const derivedCover = coverImage?.url ? null : youtubeThumbnail(url ?? '', 'max');
  const derivedCoverFallback = coverImage?.url ? null : youtubeThumbnail(url ?? '', 'hq');

  if (!url) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
            No video URL — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        {title ? (
          <h2 className="mb-6 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h2>
        ) : null}
        <div className={`relative overflow-hidden rounded-2xl ${ratioClass}`}>
          <VideoEmbedPlayer
            src={toEmbedSrc(url)}
            title={title ?? 'Embedded video'}
            playLabel={t('reelPlay')}
            coverUrl={coverImage?.url ?? derivedCover}
            coverFallbackUrl={derivedCoverFallback}
            coverUnoptimized={!coverImage?.url && Boolean(derivedCover)}
            coverAlt={coverImage?.alt ?? 'Video cover'}
            dark={props.background === 'dark'}
          />
        </div>
      </div>
    </section>
  );
}