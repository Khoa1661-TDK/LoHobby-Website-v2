// components/blocks/FeatureGrid.tsx — icon + title + text grid, or linked image cards.
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import type { ComponentType, ReactElement, ReactNode } from 'react';
import type { LucideProps } from 'lucide-react';
import {
  Zap, Truck, Shield, Star, Box, Layers, Printer, Sparkles,
  Heart, Clock, Award, Package, Wrench, Ruler, Palette, ThumbsUp,
} from 'lucide-react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

const ICONS: Record<string, ComponentType<LucideProps>> = {
  zap: Zap, truck: Truck, shield: Shield, star: Star,
  box: Box, layers: Layers, printer: Printer, sparkles: Sparkles,
  heart: Heart, clock: Clock, award: Award, package: Package,
  wrench: Wrench, ruler: Ruler, palette: Palette, thumbsUp: ThumbsUp,
};

type Item = {
  icon?: string | null;
  image?: { url?: string; alt?: string } | null;
  title?: string | null;
  text?: string | null;
  caption?: string | null;
  href?: string | null;
};
type Props = {
  heading?: string | null;
  subheading?: string | null;
  variant?: 'list' | 'cards' | null;
  columns?: '2' | '3' | '4' | null;
  items?: Item[] | null;
} & BlockAppearance;

/** Wrap content in a Link when href is set, else a plain div. */
function MaybeLink({
  href,
  className,
  children,
}: {
  href?: string | null;
  className: string;
  children: ReactNode;
}): ReactElement {
  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return <div className={className}>{children}</div>;
}

export default function FeatureGridBlock(props: Props): ReactElement | null {
  const { heading, subheading, variant = 'list', columns = '3', items } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const filtered = (items ?? []).filter((it) => it?.title || it?.text || it?.image?.url);
  if (filtered.length === 0) return null;

  const colClass =
    columns === '2'
      ? 'sm:grid-cols-2'
      : columns === '4'
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-2 lg:grid-cols-3';

  return (
    <section className={section} style={style}>
      <div className={container}>
        {heading ? (
          <h2 className="mb-3 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {heading}
          </h2>
        ) : null}
        {subheading ? (
          <p className="mx-auto mb-10 max-w-2xl text-center text-sm text-ink/60">{subheading}</p>
        ) : null}
        <div className={`grid grid-cols-1 ${variant === 'cards' ? 'gap-6' : 'gap-8'} ${colClass}`}>
          {filtered.map((it, i) =>
            variant === 'cards' ? (
              <MaybeLink
                key={i}
                href={it.href}
                className="group flex flex-col overflow-hidden rounded-card border border-line bg-surface shadow-sh-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-sh-2"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-surface-raised">
                  {it.image?.url ? (
                    <Image
                      src={it.image.url}
                      alt={it.image.alt ?? it.title ?? ''}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {it.title ? (
                    <h3 className="font-display text-base font-semibold text-ink">{it.title}</h3>
                  ) : null}
                  {it.caption ? (
                    <p className="mt-1 text-xs uppercase tracking-wide text-ink/50">{it.caption}</p>
                  ) : null}
                  {it.text ? <p className="mt-1.5 text-sm text-ink/60">{it.text}</p> : null}
                </div>
              </MaybeLink>
            ) : (
              <MaybeLink key={i} href={it.href} className="flex flex-col items-start">
                {(() => {
                  // An assigned image wins over the icon; fall back to the icon when no image.
                  if (it.image?.url) {
                    return (
                      <span className="relative mb-4 h-14 w-14 overflow-hidden rounded-card-sm bg-surface-raised">
                        <Image
                          src={it.image.url}
                          alt={it.image.alt ?? it.title ?? ''}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </span>
                    );
                  }
                  const Icon = it.icon ? ICONS[it.icon] : undefined;
                  return Icon ? (
                    <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-card-sm bg-surface-raised text-accent">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                  ) : null;
                })()}
                {it.title ? <h3 className="font-display text-base font-semibold text-ink">{it.title}</h3> : null}
                {it.caption ? (
                  <p className="mt-1 text-xs uppercase tracking-wide text-ink/50">{it.caption}</p>
                ) : null}
                {it.text ? <p className="mt-1.5 text-sm text-ink/60">{it.text}</p> : null}
              </MaybeLink>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
