// components/blocks/Hero.tsx
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type CollageItem = { image?: { url?: string; alt?: string } | null; alt?: string | null };
type StatItem = { value?: string | null; label?: string | null };

type Props = {
  eyebrow?: string | null;
  headline?: string | null;
  headlineHighlight?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaStyle?: 'primary' | 'outline' | 'minimal' | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaHref?: string | null;
  stats?: StatItem[] | null;
  collage?: CollageItem[] | null;
  mediaBadge?: string | null;
  image?: { url?: string; alt?: string } | null;
  imagePosition?: 'left' | 'right' | 'background' | 'none' | null;
  textAlign?: 'left' | 'center' | null;
} & BlockAppearance;

export default function HeroBlock(props: Props): ReactElement {
  const {
    eyebrow,
    headline,
    headlineHighlight,
    subheadline,
    ctaLabel,
    ctaHref,
    ctaStyle = 'primary',
    secondaryCtaLabel,
    secondaryCtaHref,
    stats,
    collage,
    mediaBadge,
    image,
    imagePosition = 'right',
    textAlign = 'left',
  } = props;

  const { section, container, style } = blockAppearanceClasses(props);

  // Right-hand visual: a 2×2 grid of tiles. Each tile shows a collage image when
  // one is uploaded, otherwise a brand-accent gradient with its label. Keep items
  // that carry either an image or a label so gradient-only tiles still render.
  const tiles = (collage ?? [])
    .map((c) => ({ url: c?.image?.url ?? null, label: c?.alt ?? c?.image?.alt ?? '' }))
    .filter((t) => t.url || t.label)
    .slice(0, 4);
  const validStats = (stats ?? []).filter((s) => s?.value && s?.label);

  const ctaClass = (() => {
    switch (ctaStyle) {
      case 'outline':
        return 'inline-flex items-center gap-2 rounded-lg border border-line px-6 py-3.5 text-sm font-bold transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent';
      case 'minimal':
        return 'text-sm font-medium underline underline-offset-4 hover:opacity-70 transition-opacity';
      default:
        return 'inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-accent-3';
    }
  })();

  const textAlignClass = textAlign === 'center' ? 'text-center items-center' : 'text-left items-start';

  // Render the headline, accent-underlining the first case-insensitive match of
  // `headlineHighlight` (the mockup's underlined "móc khóa"). Falls back to plain
  // text when no highlight is set or the phrase isn't found.
  const renderHeadline = (): ReactElement | string | null => {
    if (!headline) return null;
    const needle = headlineHighlight?.trim();
    if (!needle) return headline;
    const idx = headline.toLowerCase().indexOf(needle.toLowerCase());
    if (idx === -1) return headline;
    const before = headline.slice(0, idx);
    const match = headline.slice(idx, idx + needle.length);
    const after = headline.slice(idx + needle.length);
    return (
      <>
        {before}
        <span className="relative whitespace-nowrap text-accent">
          {match}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-1.5 -z-10 h-3 bg-accent/[0.16]"
          />
        </span>
        {after}
      </>
    );
  };

  if (imagePosition === 'background' && image?.url) {
    return (
      <section className={`relative overflow-hidden ${section}`} style={style}>
        <div className="absolute inset-0">
          <Image
            src={image.url}
            alt={image.alt ?? ''}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-ink/50" />
        </div>
        <div className={`relative ${container} flex min-h-[60vh] flex-col justify-center ${textAlignClass}`}>
          {eyebrow ? (
            <span className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="max-w-2xl font-display text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            {renderHeadline()}
          </h1>
          {subheadline ? (
            <p className="mt-4 max-w-xl text-lg text-surface/80">{subheadline}</p>
          ) : null}
          {(ctaLabel && ctaHref) || (secondaryCtaLabel && secondaryCtaHref) ? (
            <div className={`mt-6 flex flex-wrap gap-3 ${textAlign === 'center' ? 'justify-center' : ''}`}>
              {ctaLabel && ctaHref ? (
                <Link
                  href={ctaHref}
                  className="inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface"
                >
                  {ctaLabel}
                </Link>
              ) : null}
              {secondaryCtaLabel && secondaryCtaHref ? (
                <Link
                  href={secondaryCtaHref}
                  className="inline-block rounded-full border border-white/40 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  {secondaryCtaLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
          {validStats.length > 0 ? (
            <dl className={`mt-10 flex flex-wrap gap-x-10 gap-y-4 ${textAlign === 'center' ? 'justify-center' : ''}`}>
              {validStats.map((s, i) => (
                <div key={i} className="flex flex-col">
                  <dt className="order-2 text-xs uppercase tracking-wide text-white/60">{s.label}</dt>
                  <dd className="order-1 font-display text-2xl font-bold text-white md:text-3xl">{s.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </section>
    );
  }

  // A visual panel shows when we have tiles or a single fallback image.
  const hasVisual = tiles.length > 0 || (imagePosition !== 'none' && Boolean(image?.url));
  const visualFirst = imagePosition === 'left';

  return (
    <section className={`relative overflow-hidden ${section}`} style={style}>
      <div className={`relative z-10 ${container}`}>
        <div
          className={`grid items-center gap-10 lg:gap-0 ${
            hasVisual ? 'lg:grid-cols-[1.05fr_0.95fr]' : 'grid-cols-1'
          }`}
        >
          {/* ---- Text column ---- */}
          <div
            className={`flex flex-col ${textAlignClass} ${
              hasVisual ? `py-8 lg:py-16 lg:pr-14 ${visualFirst ? 'lg:order-2 lg:pl-14 lg:pr-0' : ''}` : 'w-full'
            }`}
          >
            {eyebrow ? (
              <span className="mb-5 inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
                <span className="h-0.5 w-7 bg-accent" aria-hidden="true" />
                {eyebrow}
              </span>
            ) : null}
            <h1 className="font-display text-4xl font-extrabold leading-[1.04] tracking-tight md:text-5xl lg:text-6xl">
              {renderHeadline()}
            </h1>
            {subheadline ? (
              <p className="mt-5 max-w-[46ch] text-base text-ink/70 md:text-lg">{subheadline}</p>
            ) : null}
            {(ctaLabel && ctaHref) || (secondaryCtaLabel && secondaryCtaHref) ? (
              <div className={`mt-8 flex flex-wrap gap-3 ${textAlign === 'center' ? 'justify-center' : ''}`}>
                {ctaLabel && ctaHref ? (
                  <Link href={ctaHref} className={ctaClass}>
                    {ctaLabel}
                  </Link>
                ) : null}
                {secondaryCtaLabel && secondaryCtaHref ? (
                  <Link
                    href={secondaryCtaHref}
                    className="inline-flex items-center gap-2 rounded-lg border border-line px-6 py-3.5 text-sm font-bold text-ink transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
                  >
                    {secondaryCtaLabel}
                  </Link>
                ) : null}
              </div>
            ) : null}
            {validStats.length > 0 ? (
              <dl
                className={`mt-11 flex flex-wrap gap-x-11 gap-y-4 border-t border-line pt-6 ${
                  textAlign === 'center' ? 'justify-center' : ''
                }`}
              >
                {validStats.map((s, i) => (
                  <div key={i} className="flex flex-col">
                    <dt className="order-2 text-[10px] uppercase tracking-[0.2em] text-ink/50">{s.label}</dt>
                    <dd className="order-1 font-display text-2xl font-extrabold tracking-tight text-accent md:text-3xl">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>

          {/* ---- Visual column ---- */}
          {hasVisual && tiles.length === 0 && image?.url ? (
            // Single-image fallback (no collage tiles configured).
            <div
              className={`relative min-h-[280px] overflow-hidden border-line bg-surface-raised lg:min-h-[440px] lg:self-stretch lg:border-l ${
                visualFirst ? 'lg:order-1 lg:border-l-0 lg:border-r' : ''
              }`}
            >
              {mediaBadge ? <MediaBadge label={mediaBadge} /> : null}
              <Image
                src={image.url}
                alt={image.alt ?? ''}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
                priority
              />
            </div>
          ) : hasVisual ? (
            // 2×2 tile grid driven by the collage array.
            <div
              className={`relative grid grid-cols-2 gap-px overflow-hidden border-line bg-line lg:min-h-[440px] lg:self-stretch lg:border-l ${
                visualFirst ? 'lg:order-1 lg:border-l-0 lg:border-r' : ''
              }`}
            >
              {mediaBadge ? <MediaBadge label={mediaBadge} /> : null}
              {tiles.map((t, i) => (
                <div
                  key={i}
                  className="relative flex min-h-[180px] items-end overflow-hidden bg-surface p-4"
                >
                  {t.url ? (
                    <Image
                      src={t.url}
                      alt={t.label}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 50vw, 25vw"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 bg-gradient-to-br ${
                        TILE_GRADIENTS[i % TILE_GRADIENTS.length]
                      }`}
                    />
                  )}
                  {t.label ? (
                    <span className="relative z-10 rounded-md border border-line bg-surface/90 px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-ink">
                      {t.label}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** Pill with a pulsing dot, floated over the media panel (mockup's "new stock daily"). */
function MediaBadge({ label }: { label: string }): ReactElement {
  return (
    <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent-3 opacity-75 motion-safe:animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-3" />
      </span>
      {label}
    </div>
  );
}

/** Brand-accent gradient fallbacks for hero tiles with no uploaded image. */
const TILE_GRADIENTS = [
  'from-accent/70 via-accent to-accent-3',
  'from-accent-soft via-accent/60 to-accent',
  'from-accent-3 via-accent to-accent-3',
  'from-accent-soft via-accent/40 to-accent/70',
];