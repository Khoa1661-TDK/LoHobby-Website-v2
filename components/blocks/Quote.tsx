// components/blocks/Quote.tsx — large pull-quote with optional avatar + attribution.
import Image from 'next/image';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Media = { url?: string; alt?: string } | string | number | null | undefined;

type Props = {
  quote?: string | null;
  author?: string | null;
  role?: string | null;
  avatar?: Media;
} & BlockAppearance;

function resolveImage(image: Media): { url: string; alt: string } | null {
  if (!image || typeof image !== 'object') return null;
  if (!image.url) return null;
  return { url: image.url, alt: image.alt ?? '' };
}

export default function QuoteBlock(props: Props): ReactElement | null {
  const { quote, author, role, avatar } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!quote) return null;

  const img = resolveImage(avatar);

  return (
    <section className={section} style={style}>
      <div className={container}>
        <figure className="mx-auto max-w-3xl text-center">
          <blockquote className="font-display text-2xl font-medium leading-snug tracking-tight md:text-3xl lg:text-4xl">
            “{quote}”
          </blockquote>
          {(img || author || role) ? (
            <figcaption className="mt-8 flex flex-col items-center gap-3">
              {img ? (
                <span className="relative h-14 w-14 overflow-hidden rounded-full">
                  <Image src={img.url} alt={img.alt || author || ''} fill className="object-cover" sizes="56px" />
                </span>
              ) : null}
              <span className="text-sm">
                {author ? <span className="font-semibold">{author}</span> : null}
                {author && role ? <span className="text-ink/50"> · </span> : null}
                {role ? <span className="text-ink/60">{role}</span> : null}
              </span>
            </figcaption>
          ) : null}
        </figure>
      </div>
    </section>
  );
}
