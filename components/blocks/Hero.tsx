// components/blocks/Hero.tsx
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  headline?: string | null;
  subheadline?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  ctaStyle?: 'primary' | 'outline' | 'minimal' | null;
  image?: { url?: string; alt?: string } | null;
  imagePosition?: 'left' | 'right' | 'background' | 'none' | null;
  textAlign?: 'left' | 'center' | null;
} & BlockAppearance;

export default function HeroBlock(props: Props): ReactElement {
  const {
    headline,
    subheadline,
    ctaLabel,
    ctaHref,
    ctaStyle = 'primary',
    image,
    imagePosition = 'right',
    textAlign = 'left',
  } = props;

  const { section, container, style } = blockAppearanceClasses(props);

  const ctaClass = (() => {
    switch (ctaStyle) {
      case 'outline':
        return 'border border-warm-900 px-6 py-3 text-sm font-medium rounded-full hover:bg-warm-900 hover:text-warm-50 transition-colors';
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
          <div className="absolute inset-0 bg-warm-900/50" />
        </div>
        <div className={`relative ${container} flex min-h-[60vh] flex-col justify-center ${textAlignClass}`}>
          <h1 className="max-w-2xl font-display text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            {headline}
          </h1>
          {subheadline ? (
            <p className="mt-4 max-w-xl text-lg text-warm-200">{subheadline}</p>
          ) : null}
          {ctaLabel && ctaHref ? (
            <Link
              href={ctaHref}
              className={`mt-6 inline-block rounded-full bg-white px-6 py-3 text-sm font-medium text-warm-900 hover:bg-warm-100 transition-colors`}
            >
              {ctaLabel}
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  const hasImage = imagePosition !== 'none' && image?.url;

  return (
    <section className={section} style={style}>
      <div className={container}>
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
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl md:w-1/2">
              <Image
                src={image.url ?? ''}
                alt={image.alt ?? ''}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          ) : null}
          <div className={`flex flex-col ${textAlignClass} ${hasImage ? 'md:w-1/2' : 'w-full'}`}>
            <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {headline}
            </h1>
            {subheadline ? (
              <p className="mt-4 max-w-xl text-lg text-warm-600 dark:text-warm-300">
                {subheadline}
              </p>
            ) : null}
            {ctaLabel && ctaHref ? (
              <Link href={ctaHref} className={`mt-6 ${ctaClass}`}>
                {ctaLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}