// src/payload/components/PageTitleCell.tsx — Pages list title cell linking into the visual builder.
import Link from 'next/link';
import type { ReactElement } from 'react';
import { routing } from '@/i18n/routing';

type Props = {
  cellData?: unknown;
  rowData?: { slug?: unknown; title?: unknown };
};

export function PageTitleCell({ cellData, rowData }: Props): ReactElement {
  const title =
    typeof cellData === 'string' && cellData.length > 0
      ? cellData
      : typeof rowData?.title === 'string'
        ? rowData.title
        : 'Untitled';
  const slug = typeof rowData?.slug === 'string' ? rowData.slug : '';

  if (!slug) {
    return <span>{title}</span>;
  }

  return <Link href={`/${routing.defaultLocale}/build/${slug}`}>{title}</Link>;
}
