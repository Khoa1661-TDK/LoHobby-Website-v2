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
  // Newsletter defaults to the filament-yellow accent, but the editor's
  // `background` appearance field overrides it: pick Light/Dark/Custom color in
  // the admin and that wins. Only the default (Theme/unset) case applies the
  // fixed dark foreground hexes that read on yellow; any explicit background
  // inherits the appearance/theme foreground tokens instead so contrast follows
  // the chosen surface.
  const isDefaultBackground = !props.background || props.background === 'theme';
  const { section, container, style } = blockAppearanceClasses(props);
  const sectionBg = isDefaultBackground ? 'bg-accent-soft' : '';
  const headingColor = isDefaultBackground ? 'text-[#1B2027]' : '';
  const mutedColor = isDefaultBackground ? 'text-[#1B2027]/70' : 'opacity-70';

  return (
    <section className={`${sectionBg} ${section}`.trim()} style={style}>
      <div className={`${container} text-center`}>
        <h2
          className={`font-display text-2xl font-bold tracking-tight md:text-3xl ${headingColor}`.trim()}
        >
          {headline}
        </h2>
        {subheadline ? (
          <p className={`mt-3 max-w-lg mx-auto ${mutedColor}`.trim()}>
            {subheadline}
          </p>
        ) : null}
        <div className="mt-6">
          <div className="w-full rounded-2xl bg-[#14181D] p-6 text-left md:p-8">
            <FooterNewsletter />
          </div>
        </div>
        {disclaimer ? (
          <p className={`mt-3 text-xs ${mutedColor}`.trim()}>{disclaimer}</p>
        ) : null}
      </div>
    </section>
  );
}
