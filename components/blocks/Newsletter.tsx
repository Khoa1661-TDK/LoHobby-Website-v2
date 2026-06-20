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
  // we derive padding/width only and apply bg-accent-2/text-ink ourselves.
  const { section, container, style } = blockAppearanceClasses({
    ...props,
    background: 'theme',
  });

  return (
    <section className={`bg-accent-2 text-ink ${section}`} style={style}>
      <div className={`${container} text-center`}>
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {headline}
        </h2>
        {subheadline ? (
          <p className="mt-3 text-ink/60 max-w-lg mx-auto">
            {subheadline}
          </p>
        ) : null}
        <div className="mt-6">
          <FooterNewsletter />
        </div>
        {disclaimer ? (
          <p className="mt-3 text-xs text-ink/60">{disclaimer}</p>
        ) : null}
      </div>
    </section>
  );
}