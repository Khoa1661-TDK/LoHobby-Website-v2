// components/blocks/Text.tsx — plain-text block with optional whole-block link.
import { Link } from '@/i18n/navigation';
import type { ReactElement, ReactNode } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Props = {
  heading?: string | null;
  body?: string | null;
  textAlign?: 'left' | 'center' | null;
  size?: 'small' | 'normal' | 'large' | null;
  url?: string | null;
  openInNewTab?: boolean | null;
} & BlockAppearance;

const HEADING_SIZE: Record<'small' | 'normal' | 'large', string> = {
  small: 'text-xl md:text-2xl',
  normal: 'text-2xl md:text-3xl',
  large: 'text-3xl md:text-5xl',
};

const BODY_SIZE: Record<'small' | 'normal' | 'large', string> = {
  small: 'text-sm',
  normal: 'text-base',
  large: 'text-lg md:text-xl',
};

export default function TextBlock(props: Props): ReactElement | null {
  const { heading, body, textAlign = 'left', size = 'normal', url, openInNewTab } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!heading && !body) return null;

  const align = textAlign === 'center' ? 'text-center' : 'text-left';
  const sizeKey = size ?? 'normal';

  const inner: ReactNode = (
    <div className={align}>
      {heading ? (
        <h2 className={`font-display font-bold tracking-tight ${HEADING_SIZE[sizeKey]}`}>
          {heading}
        </h2>
      ) : null}
      {body ? (
        <p className={`max-w-2xl whitespace-pre-line text-ink/70 ${heading ? 'mt-4' : ''} ${BODY_SIZE[sizeKey]} ${textAlign === 'center' ? 'mx-auto' : ''}`}>
          {body}
        </p>
      ) : null}
    </div>
  );

  return (
    <section className={section} style={style}>
      <div className={container}>
        {url ? (
          <Link href={url} className="block transition-opacity hover:opacity-80" {...linkAttrs(url, openInNewTab)}>
            {inner}
          </Link>
        ) : (
          inner
        )}
      </div>
    </section>
  );
}
