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
  const { section, container, style } = blockAppearanceClasses(props);

  return (
    <section className={section} style={style}>
      <div className={`${container} text-center`}>
        <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl">
          {headline}
        </h2>
        {subheadline ? (
          <p className="mt-3 text-warm-600 dark:text-warm-300 max-w-lg mx-auto">
            {subheadline}
          </p>
        ) : null}
        <div className="mt-6">
          <FooterNewsletter />
        </div>
        {disclaimer ? (
          <p className="mt-3 text-xs text-warm-400">{disclaimer}</p>
        ) : null}
      </div>
    </section>
  );
}