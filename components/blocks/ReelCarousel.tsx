// components/blocks/ReelCarousel.tsx — server block: header (eyebrow / heading /
// follow link) + a horizontal reel carousel (client island) with arrow nav.
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import { getTranslations } from 'next-intl/server';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import ReelCarousel, { type CarouselReel, type ReelPlatform } from './ReelCarousel.client';
import { youtubeThumbnail } from '@/lib/reel-embed';

type RawReel = {
  platform?: ReelPlatform | null;
  url?: string | null;
  poster?: { url?: string; alt?: string } | null;
  caption?: string | null;
  views?: string | null;
};

type Props = {
  eyebrow?: string | null;
  heading?: string | null;
  followLabel?: string | null;
  followHref?: string | null;
  reels?: RawReel[] | null;
} & BlockAppearance;

export default async function ReelCarouselBlock(props: Props): Promise<ReactElement | null> {
  const { eyebrow, heading, followLabel, followHref, reels } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const t = await getTranslations('product');

  const resolved: CarouselReel[] = (reels ?? [])
    .filter((reel): reel is RawReel & { url: string } => Boolean(reel?.url))
    .map((reel) => {
      const platform = (reel.platform ?? 'youtube') as ReelPlatform;
      // No hand-uploaded poster? For YouTube we can derive a thumbnail from the
      // video id; other platforms have no public thumbnail URL, so leave it null.
      const posterUrl =
        reel.poster?.url ?? (platform === 'youtube' ? youtubeThumbnail(reel.url) : null);
      return {
        platform,
        url: reel.url,
        posterUrl,
        posterAlt: reel.poster?.alt ?? reel.caption ?? '',
        caption: reel.caption ?? null,
        views: reel.views ?? null,
      };
    });

  if (resolved.length === 0) return null;

  return (
    <section className={section} style={style}>
      <div className={container}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                {eyebrow}
              </p>
            ) : null}
            {heading ? (
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink md:text-3xl">
                {heading}
              </h2>
            ) : null}
          </div>
          {followLabel && followHref ? (
            <Link
              href={followHref}
              className="inline-flex rounded-full border border-line px-5 py-2 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-surface"
            >
              {followLabel}
            </Link>
          ) : null}
        </div>
        <ReelCarousel reels={resolved} playLabel={t('reelPlay')} closeLabel={t('reelClose')} />
      </div>
    </section>
  );
}
