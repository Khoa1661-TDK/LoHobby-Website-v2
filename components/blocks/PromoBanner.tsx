// components/blocks/PromoBanner.tsx
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  text: string;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  dismissible?: boolean;
  countdown?: string | null;
} & BlockAppearance;

export default function PromoBannerBlock(props: Props): ReactElement {
  const { text, ctaLabel, ctaHref, dismissible = false } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const darkBg = props.background === 'dark';

  return (
    <section
      className={`${section}`}
      style={{
        ...style,
        ...(props.background === 'custom' && props.backgroundCustom
          ? { backgroundColor: props.backgroundCustom }
          : {}),
      }}
    >
      <div
        className={`${container} flex items-center justify-center gap-4 py-3 text-center text-sm font-medium ${darkBg ? 'text-warm-100' : 'text-warm-900'}`}
      >
        <span>{text}</span>
        {ctaLabel && ctaHref ? (
          <Link
            href={ctaHref}
            className={`inline-block rounded-full px-4 py-1 text-xs font-semibold ${
              darkBg
                ? 'bg-white text-warm-900 hover:bg-warm-100'
                : 'bg-filament-500 text-white hover:bg-filament-600'
            } transition-colors`}
          >
            {ctaLabel}
          </Link>
        ) : null}
        {dismissible ? (
          <button
            className={`ml-2 opacity-60 hover:opacity-100 ${darkBg ? 'text-warm-100' : 'text-warm-900'}`}
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