// components/blocks/CardGrid.tsx — responsive grid of image/title/body cards.
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement, ReactNode } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Media = { url?: string; alt?: string } | string | number | null | undefined;

type Card = {
  image?: Media;
  title?: string | null;
  body?: string | null;
  url?: string | null;
  openInNewTab?: boolean | null;
};

type Props = {
  heading?: string | null;
  columnCount?: '2' | '3' | '4' | null;
  cards?: Card[] | null;
} & BlockAppearance;

const GRID_COLS: Record<'2' | '3' | '4', string> = {
  '2': 'grid-cols-1 sm:grid-cols-2',
  '3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

function resolveImage(image: Media): { url: string; alt: string } | null {
  if (!image || typeof image !== 'object') return null;
  if (!image.url) return null;
  return { url: image.url, alt: image.alt ?? '' };
}

function CardItem({ card }: { card: Card }): ReactElement {
  const img = resolveImage(card.image);
  const inner: ReactNode = (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border border-line">
      {img ? (
        <div className="relative aspect-[4/3] w-full">
          <Image src={img.url} alt={img.alt || card.title || ''} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-5">
        {card.title ? (
          <h3 className="font-display text-lg font-semibold tracking-tight">{card.title}</h3>
        ) : null}
        {card.body ? (
          <p className="mt-2 whitespace-pre-line text-sm text-ink/70">{card.body}</p>
        ) : null}
      </div>
    </div>
  );

  if (card.url) {
    return (
      <Link
        href={card.url}
        className="block h-full transition-shadow hover:shadow-md"
        {...linkAttrs(card.url, card.openInNewTab)}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}

export default function CardGridBlock(props: Props): ReactElement {
  const { heading, columnCount = '3', cards } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!cards || cards.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
            No cards — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        {heading ? (
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight md:text-3xl">
            {heading}
          </h2>
        ) : null}
        <div className={`grid gap-6 ${GRID_COLS[columnCount ?? '3']}`}>
          {cards.map((card, i) => (
            <CardItem key={i} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
