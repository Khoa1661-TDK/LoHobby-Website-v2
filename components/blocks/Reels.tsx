// components/blocks/Reels.tsx — server block: header (eyebrow/heading/follow
// link) + a tile grid that opens a play modal (client island).
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { getTranslations } from 'next-intl/server';
import ReelsClient, { type ReelTile } from './Reels.client';

type RawTile = {
  poster?: { url?: string; alt?: string } | null;
  tag?: string | null;
  caption?: string | null;
  views?: string | null;
  embedUrl?: string | null;
};

type Props = {
  eyebrow?: string | null;
  heading?: string | null;
  followLabel?: string | null;
  followHref?: string | null;
  tiles?: RawTile[] | null;
} & BlockAppearance;

export default async function ReelsBlock(props: Props): Promise<ReactElement | null> {
  const { eyebrow, heading, followLabel, followHref, tiles } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const t = await getTranslations('product');

  const resolved: ReelTile[] = (tiles ?? [])
    .filter((tile) => tile?.poster?.url || tile?.embedUrl)
    .map((tile) => ({
      posterUrl: tile.poster?.url ?? null,
      posterAlt: tile.poster?.alt ?? tile.caption ?? '',
      tag: tile.tag ?? null,
      caption: tile.caption ?? null,
      views: tile.views ?? null,
      embedUrl: tile.embedUrl ?? null,
    }));

  if (resolved.length === 0) return null;

  return (
    <section className={section} style={style}>
      <div className={container}>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow ? (
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent-2">
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
        <ReelsClient
          tiles={resolved}
          playLabel={t('reelPlay')}
          closeLabel={t('reelClose')}
        />
      </div>
    </section>
  );
}
