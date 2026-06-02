// components/blocks/LogoCloud.tsx
import Image from 'next/image';
import Link from 'next/link';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type LogoEntry = {
  image?: { url?: string; alt?: string } | null;
  alt?: string | null;
  href?: string | null;
};

type Props = {
  title?: string | null;
  logos?: LogoEntry[] | null;
  animate?: boolean;
} & BlockAppearance;

export default function LogoCloudBlock(props: Props): ReactElement {
  const { title, logos, animate = false } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  if (!logos || logos.length === 0) {
    return (
      <section className={section} style={style}>
        <div className={container}>
          <p className="text-center text-sm text-warm-500">
            No logos — configure this block in the admin panel.
          </p>
        </div>
      </section>
    );
  }

  const items = logos.map((logo, i) => {
    const imgUrl = logo.image?.url;
    const alt = logo.alt ?? logo.image?.alt ?? '';

    if (!imgUrl) return null;

    const img = (
      <Image
        src={imgUrl}
        alt={alt}
        width={120}
        height={48}
        className="h-10 w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
      />
    );

    return (
      <div key={i} className="flex-shrink-0 px-6">
        {logo.href ? (
          <Link href={logo.href} target="_blank" rel="noopener noreferrer">
            {img}
          </Link>
        ) : (
          img
        )}
      </div>
    );
  }).filter(Boolean);

  return (
    <section className={section} style={style}>
      <div className={container}>
        {title ? (
          <h2 className="mb-8 text-center font-display text-xl font-bold tracking-tight">
            {title}
          </h2>
        ) : null}

        {animate ? (
          <div className="overflow-hidden">
            <div className="flex animate-marquee">{items}</div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-8">
            {items}
          </div>
        )}
      </div>
    </section>
  );
}