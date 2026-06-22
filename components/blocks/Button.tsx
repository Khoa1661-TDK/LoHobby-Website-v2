// components/blocks/Button.tsx
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Props = {
  label?: string | null;
  url?: string | null;
  openInNewTab?: boolean | null;
  style?: 'primary' | 'outline' | 'minimal' | null;
  align?: 'left' | 'center' | 'right' | null;
} & BlockAppearance;

const STYLE_CLASS: Record<'primary' | 'outline' | 'minimal', string> = {
  primary:
    'inline-block rounded-full bg-filament-500 px-6 py-3 text-sm font-medium text-white hover:bg-filament-600 transition-colors',
  outline:
    'inline-block border border-line px-6 py-3 text-sm font-medium rounded-full hover:bg-ink hover:text-surface transition-colors',
  minimal:
    'text-sm font-medium underline underline-offset-4 hover:opacity-70 transition-opacity',
};

const ALIGN_CLASS: Record<'left' | 'center' | 'right', string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

export default function ButtonBlock(props: Props): ReactElement | null {
  const { label, url, openInNewTab, style = 'primary', align = 'left' } = props;
  const { section, container, style: bgStyle } = blockAppearanceClasses(props);

  if (!label || !url) return null;

  return (
    <section className={section} style={bgStyle}>
      <div className={container}>
        <div className={`flex ${ALIGN_CLASS[align ?? 'left']}`}>
          <Link href={url} className={STYLE_CLASS[style ?? 'primary']} {...linkAttrs(url, openInNewTab)}>
            {label}
          </Link>
        </div>
      </div>
    </section>
  );
}
