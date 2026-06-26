// components/blocks/PromoBanner.tsx
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement, ReactNode } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Props = {
  text?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  dismissible?: boolean;
  countdown?: string | null;
  url?: string | null;
  openInNewTab?: boolean | null;
  backgroundImage?: { url?: string; alt?: string } | null;
} & BlockAppearance;

export default function PromoBannerBlock(props: Props): ReactElement {
  const { text, ctaLabel, ctaHref, dismissible = false, url, openInNewTab, backgroundImage } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const hasImage = Boolean(backgroundImage?.url);
  // Force light text over the image's dark overlay regardless of the chosen color mode.
  const darkBg = hasImage || props.background === 'dark';

  // Wrap the banner content in a link when `url` is set and there is no inline CTA
  // taking the click. Keeps the strip clickable as a whole.
  const wrap = (children: ReactNode): ReactNode =>
    url ? (
      <Link href={url} className="contents" {...linkAttrs(url, openInNewTab)}>
        {children}
      </Link>
    ) : (
      children
    );

  return (
    <section
      className={`${hasImage ? 'relative overflow-hidden ' : ''}${section}`}
      style={{
        ...style,
        ...(!hasImage && props.background === 'custom' && props.backgroundCustom
          ? { backgroundColor: props.backgroundCustom }
          : {}),
      }}
    >
      {hasImage ? (
        <div className="absolute inset-0">
          <Image
            src={backgroundImage!.url!}
            alt={backgroundImage!.alt ?? ''}
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-ink/50" />
        </div>
      ) : null}
      <div
        className={`${hasImage ? 'relative ' : ''}${container} flex items-center justify-center gap-4 py-3 text-center text-sm font-medium ${darkBg ? 'text-surface' : 'text-ink'}`}
      >
        {wrap(<span>{text}</span>)}
        {ctaLabel && ctaHref ? (
          <Link
            href={ctaHref}
            className={`inline-block rounded-full px-4 py-1 text-xs font-semibold ${
              darkBg
                ? 'bg-white text-ink hover:bg-surface'
                : 'bg-filament-500 text-white hover:bg-filament-600'
            } transition-colors`}
          >
            {ctaLabel}
          </Link>
        ) : null}
        {dismissible ? (
          <button
            className={`ml-2 opacity-60 hover:opacity-100 ${darkBg ? 'text-surface' : 'text-ink'}`}
            aria-label="Dismiss"
            // The actual dismiss logic would use a client component with state
            onClick={undefined}
          >
            ✕
          </button>
        ) : null}
      </div>
    </section>
  );
}