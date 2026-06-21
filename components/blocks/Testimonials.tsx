// components/blocks/Testimonials.tsx
import Image from 'next/image';
import type { ReactElement } from 'react';
import Stars from '@/components/product/stars';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type TestimonialEntry = {
  quote: string;
  author: string;
  role?: string | null;
  avatar?: { url?: string; alt?: string } | null;
  rating?: number | null;
};

type Props = {
  title?: string | null;
  entries?: TestimonialEntry[] | null;
  layout?: 'grid' | 'single' | null;
} & BlockAppearance;

export default function TestimonialsBlock(props: Props): ReactElement {
  const { title, entries, layout = 'grid' } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!entries || entries.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
            No testimonials — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        {title ? (
          <h2 className="mb-8 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h2>
        ) : null}

        {layout === 'single' ? (
          <div className="max-w-2xl mx-auto text-center">
            {entries.map((entry, i) => (
              <div key={i} className="py-8 border-b border-line last:border-b-0">
                {entry.rating ? (
                  <div className="mb-3 flex justify-center">
                    <Stars rating={entry.rating} />
                  </div>
                ) : null}
                <blockquote className="text-lg italic text-ink/60">
                  &ldquo;{entry.quote}&rdquo;
                </blockquote>
                <div className="mt-4 flex items-center justify-center gap-3">
                  {entry.avatar?.url ? (
                    <Image
                      src={entry.avatar.url}
                      alt={entry.author}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                  ) : null}
                  <div>
                    <p className="font-semibold text-sm">{entry.author}</p>
                    {entry.role ? (
                      <p className="text-xs text-ink/60">{entry.role}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {entries.map((entry, i) => (
              <div
                key={i}
                className="rounded-2xl border border-line p-6"
              >
                {entry.rating ? (
                  <div className="mb-3">
                    <Stars rating={entry.rating} />
                  </div>
                ) : null}
                <blockquote className="text-ink/60">
                  &ldquo;{entry.quote}&rdquo;
                </blockquote>
                <div className="mt-4 flex items-center gap-3">
                  {entry.avatar?.url ? (
                    <Image
                      src={entry.avatar.url}
                      alt={entry.author}
                      width={36}
                      height={36}
                      className="rounded-full object-cover"
                    />
                  ) : null}
                  <div>
                    <p className="font-semibold text-sm">{entry.author}</p>
                    {entry.role ? (
                      <p className="text-xs text-ink/60">{entry.role}</p>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}