// components/blocks/ImageWithText.tsx
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Props = {
  headline?: string | null;
  body?: { root?: { children?: unknown } } | string | null;
  image?: { url?: string; alt?: string } | null;
  imagePosition?: 'left' | 'right' | null;
  imageRatio?: '1/1' | '4/3' | '3/4' | '16/9' | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  url?: string | null;
  openInNewTab?: boolean | null;
} & BlockAppearance;

const ratioMap: Record<string, string> = {
  '1/1': 'aspect-square',
  '4/3': 'aspect-[4/3]',
  '3/4': 'aspect-[3/4]',
  '16/9': 'aspect-video',
};

export default function ImageWithTextBlock(props: Props): ReactElement {
  const {
    headline,
    body,
    image,
    imagePosition = 'left',
    imageRatio = '1/1',
    ctaLabel,
    ctaHref,
    url,
    openInNewTab,
  } = props;

  const { section, container, style } = blockAppearanceClasses(props);
  const ratioClass = ratioMap[imageRatio ?? '1/1'] ?? 'aspect-square';

  if (!image?.url) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <h2 className="font-display text-2xl font-bold">{headline}</h2>
          {body ? (
            <div className="prose mt-4 max-w-none dark:prose-invert">
              {typeof body === 'string' ? <p>{body}</p> : null}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        <div
          className={`flex flex-col gap-8 items-center ${
            imagePosition === 'left' ? 'md:flex-row' : 'md:flex-row-reverse'
          }`}
        >
          <div
            className={`relative w-full overflow-hidden rounded-2xl md:w-1/2 ${ratioClass}`}
          >
            {url ? (
              <Link href={url} className="contents" {...linkAttrs(url, openInNewTab)}>
                <Image
                  src={image.url}
                  alt={image.alt ?? headline ?? ''}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </Link>
            ) : (
              <Image
                src={image.url}
                alt={image.alt ?? headline ?? ''}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            )}
          </div>
          <div className="flex flex-col md:w-1/2">
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
              {headline}
            </h2>
            {body ? (
              <div className="prose mt-4 max-w-none dark:prose-invert">
                {typeof body === 'string' ? <p>{body}</p> : null}
              </div>
            ) : null}
            {ctaLabel && ctaHref ? (
              <Link
                href={ctaHref}
                className="mt-6 inline-block rounded-full bg-filament-500 px-5 py-2 text-sm font-medium text-white hover:bg-filament-600 transition-colors self-start"
              >
                {ctaLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}