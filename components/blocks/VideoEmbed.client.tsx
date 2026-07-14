// components/blocks/VideoEmbed.client.tsx — click-to-play video surface. Mirrors
// the ReelCarousel modal's proven mechanism: the <iframe> is only mounted after a
// user click (a real gesture, so autoplay is allowed), rather than eagerly on page
// load. Eager, lazy-loaded embeds render YouTube's "Video unavailable" shell in
// some environments; mounting fresh on click — the way the reel does — does not.
'use client';

import Image from 'next/image';
import { PlayIcon } from '@heroicons/react/24/solid';
import { useState, type ReactElement } from 'react';
import { toNextImageSrc } from '@/lib/product-image-snapshot';

type Props = {
  src: string;
  title: string;
  playLabel: string;
  coverUrl: string | null;
  coverFallbackUrl: string | null;
  coverAlt: string;
  dark: boolean;
  // When the cover is a YouTube-derived thumbnail (fixed-size, already compressed
  // by YouTube), skip Next's optimizer so it isn't re-encoded/downscaled a second
  // time — that double pass is what makes the poster look soft.
  coverUnoptimized: boolean;
};

export default function VideoEmbedPlayer({
  src,
  title,
  playLabel,
  coverUrl,
  coverFallbackUrl,
  coverAlt,
  dark,
  coverUnoptimized,
}: Props): ReactElement {
  const [playing, setPlaying] = useState(false);
  // maxresdefault 404s for videos with no hi-res frame; swap to the always-present
  // hqdefault once if that happens. Guarded so it can't loop.
  const [cover, setCover] = useState(coverUrl);

  if (playing) {
    // Append autoplay the same way the reel does, guarding an existing query string.
    const playSrc = `${src}${src.includes('?') ? '&' : '?'}autoplay=1`;
    return (
      <iframe
        src={playSrc}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={title ? `${playLabel}: ${title}` : playLabel}
      className={`group absolute inset-0 h-full w-full ${dark ? 'bg-ink' : 'bg-surface-raised'}`}
    >
      {cover ? (
        <Image
          src={toNextImageSrc(cover)}
          alt={coverAlt}
          fill
          quality={90}
          unoptimized={coverUnoptimized}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 1280px) 100vw, 1280px"
          onError={() => {
            if (coverFallbackUrl && cover !== coverFallbackUrl) setCover(coverFallbackUrl);
          }}
        />
      ) : null}
      <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-ink shadow-sh-2 transition-transform duration-300 group-hover:scale-110">
          <PlayIcon className="ml-1 h-7 w-7" />
        </span>
      </span>
    </button>
  );
}
