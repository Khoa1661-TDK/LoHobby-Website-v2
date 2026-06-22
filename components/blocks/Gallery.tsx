// components/blocks/Gallery.tsx
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ReactElement, ReactNode } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type GalleryImage = {
  image?: { url?: string; alt?: string } | null;
  caption?: string | null;
  href?: string | null;
};

/** Wrap gallery content in a link when `href` is set; `contents` keeps the wrapper
 *  layout-neutral so absolute captions still anchor to their relative parent. */
function MaybeLink({ href, children }: { href?: string | null; children: ReactNode }): ReactElement {
  if (href) {
    return (
      <Link href={href} className="contents" {...linkAttrs(href)}>
        {children}
      </Link>
    );
  }
  return <>{children}</>;
}

type Props = {
  title?: string | null;
  images?: GalleryImage[] | null;
  layout?: 'grid' | 'row' | 'bento' | null;
} & BlockAppearance;

export default function GalleryBlock(props: Props): ReactElement {
  const { title, images, layout = 'grid' } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!images || images.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
            No images — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  const filtered = images.filter((img) => img?.image?.url);

  if (filtered.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-ink/60">
            No valid images found.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={section} style={style}>
      <div className={container}>
        {title ? (
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h2>
        ) : null}

        {layout === 'row' ? (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {filtered.map((item, i) => (
              <div
                key={i}
                className="relative aspect-[4/3] min-w-[300px] flex-shrink-0 overflow-hidden rounded-xl snap-start"
              >
                <MaybeLink href={item.href}>
                  <Image
                    src={item.image!.url!}
                    alt={item.image!.alt ?? item.caption ?? ''}
                    fill
                    className="object-cover"
                    sizes="300px"
                  />
                  {item.caption ? (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/70 to-transparent p-3">
                      <p className="text-sm text-white">{item.caption}</p>
                    </div>
                  ) : null}
                </MaybeLink>
              </div>
            ))}
          </div>
        ) : layout === 'bento' ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filtered.map((item, i) => {
              const isFirst = i === 0;
              return (
                <div
                  key={i}
                  className={`relative overflow-hidden rounded-xl ${
                    isFirst
                      ? 'col-span-2 row-span-2 aspect-square md:aspect-auto'
                      : 'aspect-square'
                  }`}
                >
                  <MaybeLink href={item.href}>
                    <Image
                      src={item.image!.url!}
                      alt={item.image!.alt ?? item.caption ?? ''}
                      fill
                      className="object-cover"
                      sizes={isFirst ? '50vw' : '25vw'}
                    />
                    {item.caption ? (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/70 to-transparent p-3">
                        <p className="text-sm text-white">{item.caption}</p>
                      </div>
                    ) : null}
                  </MaybeLink>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="columns-2 gap-4 md:columns-3 lg:columns-4 space-y-4">
            {filtered.map((item, i) => (
              <div key={i} className="break-inside-avoid overflow-hidden rounded-xl">
                <MaybeLink href={item.href}>
                  <div className="relative">
                    <Image
                      src={item.image!.url!}
                      alt={item.image!.alt ?? item.caption ?? ''}
                      width={600}
                      height={600}
                      className="w-full h-auto object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                    {item.caption ? (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/70 to-transparent p-3">
                        <p className="text-sm text-white">{item.caption}</p>
                      </div>
                    ) : null}
                  </div>
                </MaybeLink>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}