// components/blocks/Banner.tsx — thin full-width announcement strip.
import { Link } from '@/i18n/navigation';
import type { ReactElement } from 'react';
import BlockIcon from '@/components/blocks/_icon';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Props = {
  text?: string | null;
  linkLabel?: string | null;
  url?: string | null;
  openInNewTab?: boolean | null;
  icon?: string | null;
} & BlockAppearance;

export default function BannerBlock(props: Props): ReactElement | null {
  const { text, linkLabel, url, openInNewTab, icon } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!text) return null;

  return (
    <section className={section} style={style}>
      <div className={`${container} flex flex-wrap items-center justify-center gap-2 py-3 text-center text-sm font-medium`}>
        {icon ? <BlockIcon name={icon} size={16} /> : null}
        <span>{text}</span>
        {linkLabel && url ? (
          <Link
            href={url}
            className="font-semibold underline underline-offset-4 hover:opacity-70 transition-opacity"
            {...linkAttrs(url, openInNewTab)}
          >
            {linkLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
