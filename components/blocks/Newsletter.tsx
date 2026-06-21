// components/blocks/Newsletter.tsx
import type { ReactElement } from 'react';
import FooterNewsletter from '@/components/layout/footer-newsletter';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Props = {
  headline?: string | null;
  subheadline?: string | null;
  placeholder?: string | null;
  buttonLabel?: string | null;
  disclaimer?: string | null;
} & BlockAppearance;

export default function NewsletterBlock(props: Props): ReactElement {
  const { headline, subheadline, disclaimer } = props;
  // Newsletter is the designated filament-yellow accent block — its background is
  // fixed regardless of the editor-configurable `background` appearance field, so
  // we derive padding/width only and apply bg-accent-2 ourselves. Foreground colors
  // are fixed hex values (not theme tokens) because this block stays yellow in both
  // light and dark mode, so flipping tokens like text-ink would break contrast.
  const { section, container, style } = blockAppearanceClasses({
    ...props,
    background: 'theme',
  });

  return (
    <section className={`bg-accent-2 ${section}`} style={style}>
      <div className={`${container} text-center`}>
        <h2 className="font-display text-2xl font-bold tracking-tight text-[#1B2027] md:text-3xl">
          {headline}
        </h2>
        {subheadline ? (
          <p className="mt-3 text-[#1B2027]/70 max-w-lg mx-auto">
            {subheadline}
          </p>
        ) : null}
        <div className="mt-6">
          <div className="mx-auto max-w-xl rounded-2xl bg-[#14181D] p-6 text-left">
            <FooterNewsletter />
          </div>
        </div>
        {disclaimer ? (
          <p className="mt-3 text-xs text-[#1B2027]/70">{disclaimer}</p>
        ) : null}
      </div>
    </section>
  );
}
