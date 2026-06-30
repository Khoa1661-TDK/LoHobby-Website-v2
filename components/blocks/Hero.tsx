// components/blocks/Hero.tsx
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { BuildPlateGrid } from './_primitives';

type CollageItem = { image?: { url?: string; alt?: string } | null; alt?: string | null };
type StatItem = { value?: string | null; label?: string | null };

type Props = {
  eyebrow?: string | null;
  headline?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaStyle?: 'primary' | 'outline' | 'minimal' | null;
  secondaryCtaLabel?: string | null;
  secondaryCtaHref?: string | null;
  stats?: StatItem[] | null;
  collage?: CollageItem[] | null;
  image?: { url?: string; alt?: string } | null;
  imagePosition?: 'left' | 'right' | 'background' | 'none' | null;
  textAlign?: 'left' | 'center' | null;
} & BlockAppearance;

export default function HeroBlock(props: Props): ReactElement {
  const {
    eyebrow,
    headline,
    subheadline,
    ctaLabel,
    ctaHref,
    ctaStyle = 'primary',
    secondaryCtaLabel,
    secondaryCtaHref,
    stats,
    collage,
    image,
    imagePosition = 'right',
    textAlign = 'left',
  } = props;

  const { section, container, style } = blockAppearanceClasses(props);

  const validCollage = (collage ?? [])
    .map((c) => ({ url: c?.image?.url, alt: c?.alt ?? c?.image?.alt ?? '' }))
    .filter((c): c is { url: string; alt: string } => Boolean(c.url));
  const validStats = (stats ?? []).filter((s) => s?.value && s?.label);

  const ctaClass = (() => {
    switch (ctaStyle) {
      case 'outline':
        return 'border border-line px-6 py-3 text-sm font-medium rounded-full hover:bg-ink hover:text-surface transition-colors';
      case 'minimal':
        return 'text-sm font-medium underline underline-offset-4 hover:opacity-70 transition-opacity';
      default:
        return 'inline-block rounded-full bg-filament-500 px-6 py-3 text-sm font-medium text-white hover:bg-filament-600 transition-colors';
    }
  })();

  const textAlignClass = textAlign === 'center' ? 'text-center items-center' : 'text-left items-start';

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
            {headline}
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

  const hasImage = imagePosition !== 'none' && image?.url;

  return (
    <section className={`relative ${section}`} style={style}>
      <BuildPlateGrid />
      <div className={`relative z-10 ${container}`}>
        <div
          className={`flex flex-col gap-8 ${
            hasImage
              ? imagePosition === 'left'
                ? 'md:flex-row'
                : 'md:flex-row-reverse'
              : ''
          } items-center`}
        >
          {hasImage ? (
            <div className="relative aspect-[4/3] w-full md:w-1/2">
              <div className="relative h-full w-full overflow-hidden rounded-card">
                <Image
                  src={image.url ?? ''}
                  alt={image.alt ?? ''}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
              {/* Floating collage images that gently bob over the main image. */}
              {validCollage.map((c, i) => (
                <div
                  key={i}
                  className={`absolute hidden w-28 overflow-hidden rounded-card-sm border border-line bg-surface shadow-sh-2 motion-safe:animate-float-gentle md:block lg:w-36 ${
                    COLLAGE_POSITIONS[i % COLLAGE_POSITIONS.length]
                  }`}
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <div className="relative aspect-square">
                    <Image
                      src={c.url ?? ''}
                      alt={c.alt ?? ''}
                      fill
                      className="object-cover"
                      sizes="144px"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className={`flex flex-col ${textAlignClass} ${hasImage ? 'md:w-1/2' : 'w-full'}`}>
            {eyebrow ? (
              <span className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-accent-2">
                {eyebrow}
              </span>
            ) : null}
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {headline}
            </h1>
            {subheadline ? (
              <p className="mt-4 max-w-xl text-lg text-ink/60">
                {subheadline}
              </p>
            ) : null}
            {(ctaLabel && ctaHref) || (secondaryCtaLabel && secondaryCtaHref) ? (
              <div className={`mt-6 flex flex-wrap gap-3 ${textAlign === 'center' ? 'justify-center' : ''}`}>
                {ctaLabel && ctaHref ? (
                  <Link href={ctaHref} className={ctaClass}>
                    {ctaLabel}
                  </Link>
                ) : null}
                {secondaryCtaLabel && secondaryCtaHref ? (
                  <Link
                    href={secondaryCtaHref}
                    className="inline-block rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-ink hover:text-surface"
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
                    <dt className="order-2 text-xs uppercase tracking-wide text-ink/50">{s.label}</dt>
                    <dd className="order-1 font-display text-2xl font-bold text-ink md:text-3xl">{s.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Scattered offsets for the floating collage thumbnails (md+ only). */
const COLLAGE_POSITIONS = [
  '-left-6 top-6 -rotate-6',
  '-right-6 bottom-10 rotate-6',
  'left-1/4 -bottom-6 rotate-3',
];