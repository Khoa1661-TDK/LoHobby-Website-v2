// components/blocks/Columns.tsx — responsive multi-column content grid.
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement, ReactNode } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Media = { url?: string; alt?: string } | string | number | null | undefined;

type Column = {
  heading?: string | null;
  body?: string | null;
  image?: Media;
  url?: string | null;
  openInNewTab?: boolean | null;
};

type Props = {
  columnCount?: '2' | '3' | '4' | null;
  columns?: Column[] | null;
} & BlockAppearance;

// Static class strings so Tailwind keeps them through purge.
const GRID_COLS: Record<'2' | '3' | '4', string> = {
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

/** Resolve a media upload value to a usable image, or null when unpopulated (id only). */
function resolveImage(image: Media): { url: string; alt: string } | null {
  if (!image || typeof image !== 'object') return null;
  if (!image.url) return null;
  return { url: image.url, alt: image.alt ?? '' };
}

function Card({ column }: { column: Column }): ReactElement {
  const img = resolveImage(column.image);
  const inner: ReactNode = (
    <>
      {img ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
          <Image src={img.url} alt={img.alt || column.heading || ''} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
        </div>
      ) : null}
      {column.heading ? (
        <h3 className={`font-display text-lg font-semibold tracking-tight ${img ? 'mt-4' : ''}`}>
          {column.heading}
        </h3>
      ) : null}
      {column.body ? (
        <p className="mt-2 whitespace-pre-line text-sm text-ink/70">{column.body}</p>
      ) : null}
    </>
  );

  if (column.url) {
    return (
      <Link
        href={column.url}
        className="block transition-opacity hover:opacity-80"
        {...linkAttrs(column.url, column.openInNewTab)}
      >
        {inner}
      </Link>
    );
  }
  return <div>{inner}</div>;
}

export default function ColumnsBlock(props: Props): ReactElement {
  const { columnCount = '3', columns } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!columns || columns.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
            No columns — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        <div className={`grid gap-8 ${GRID_COLS[columnCount ?? '3']}`}>
          {columns.map((column, i) => (
            <Card key={i} column={column} />
          ))}
        </div>
      </div>
    </section>
  );
}
