// components/blocks/CallToAction.tsx — heading + subheading + up to two CTA buttons.
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Props = {
  heading?: string | null;
  subheading?: string | null;
  primaryLabel?: string | null;
  primaryUrl?: string | null;
  primaryOpenInNewTab?: boolean | null;
  secondaryLabel?: string | null;
  secondaryUrl?: string | null;
  secondaryOpenInNewTab?: boolean | null;
  align?: 'left' | 'center' | null;
} & BlockAppearance;

const PRIMARY_CLASS =
  'inline-block rounded-full bg-filament-500 px-6 py-3 text-sm font-medium text-white hover:bg-filament-600 transition-colors';
const SECONDARY_CLASS =
  'inline-block border border-line px-6 py-3 text-sm font-medium rounded-full hover:bg-ink hover:text-surface transition-colors';

export default function CallToActionBlock(props: Props): ReactElement | null {
  const {
    heading,
    subheading,
    primaryLabel,
    primaryUrl,
    primaryOpenInNewTab,
    secondaryLabel,
    secondaryUrl,
    secondaryOpenInNewTab,
    align = 'center',
  } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const hasPrimary = Boolean(primaryLabel && primaryUrl);
  const hasSecondary = Boolean(secondaryLabel && secondaryUrl);

  if (!heading && !subheading && !hasPrimary && !hasSecondary) return null;

  const isCenter = align !== 'left';
  const alignClass = isCenter ? 'text-center items-center' : 'text-left items-start';

  return (
    <section className={section} style={style}>
      <div className={container}>
        <div className={`flex flex-col ${alignClass}`}>
          {heading ? (
            <h2 className="font-display text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
              {heading}
            </h2>
          ) : null}
          {subheading ? (
            <p className={`mt-4 max-w-2xl text-base text-ink/70 md:text-lg ${isCenter ? 'mx-auto' : ''}`}>
              {subheading}
            </p>
          ) : null}
          {hasPrimary || hasSecondary ? (
            <div className={`mt-6 flex flex-wrap gap-4 ${isCenter ? 'justify-center' : 'justify-start'}`}>
              {hasPrimary ? (
                <Link href={primaryUrl!} className={PRIMARY_CLASS} {...linkAttrs(primaryUrl!, primaryOpenInNewTab)}>
                  {primaryLabel}
                </Link>
              ) : null}
              {hasSecondary ? (
                <Link href={secondaryUrl!} className={SECONDARY_CLASS} {...linkAttrs(secondaryUrl!, secondaryOpenInNewTab)}>
                  {secondaryLabel}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
