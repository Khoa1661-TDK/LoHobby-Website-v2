// components/blocks/SocialBar.tsx — row of social-media icon links.
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { SocialIcon, socialPlatformLabel } from '@/components/social/SocialIcon';

type SocialItem = {
  platform?: string | null;
  url?: string | null;
};

type Props = {
  title?: string | null;
  items?: SocialItem[] | null;
  align?: 'left' | 'center' | 'right' | null;
  iconStyle?: 'solid' | 'outline' | null;
  size?: 'small' | 'medium' | 'large' | null;
} & BlockAppearance;

const ALIGN_CLASS: Record<'left' | 'center' | 'right', string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
};

const BOX_SIZE: Record<'small' | 'medium' | 'large', string> = {
  small: 'h-8 w-8',
  medium: 'h-10 w-10',
  large: 'h-12 w-12',
};

const ICON_SIZE: Record<'small' | 'medium' | 'large', string> = {
  small: 'h-4 w-4 fill-current',
  medium: 'h-5 w-5 fill-current',
  large: 'h-6 w-6 fill-current',
};

export default function SocialBarBlock(props: Props): ReactElement | null {
  const { title, items, align = 'left', iconStyle = 'solid', size = 'medium' } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const valid = (items ?? []).filter((it) => it?.platform && it?.url);
  if (valid.length === 0) return null;

  const sizeKey = size ?? 'medium';
  const boxBase =
    iconStyle === 'outline'
      ? 'border border-line hover:bg-ink hover:text-surface'
      : 'bg-ink/5 hover:bg-ink/10';

  return (
    <section className={section} style={style}>
      <div className={container}>
        {title ? (
          <h2 className="mb-4 font-display text-lg font-bold tracking-tight">{title}</h2>
        ) : null}
        <div className={`flex flex-wrap items-center gap-2 ${ALIGN_CLASS[align ?? 'left']}`}>
          {valid.map((it, i) => {
            const label = socialPlatformLabel(it.platform as string);
            return (
              <a
                key={i}
                href={it.url as string}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                title={label}
                className={`flex items-center justify-center rounded-lg transition-colors ${BOX_SIZE[sizeKey]} ${boxBase}`}
              >
                <SocialIcon platform={it.platform as string} className={ICON_SIZE[sizeKey]} />
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
