// components/blocks/FeatureGrid.tsx — icon + title + text grid.
import type { ComponentType, ReactElement } from 'react';
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

type Item = { icon?: string | null; title?: string | null; text?: string | null };
type Props = {
  heading?: string | null;
  subheading?: string | null;
  columns?: '2' | '3' | '4' | null;
  items?: Item[] | null;
} & BlockAppearance;

export default function FeatureGridBlock(props: Props): ReactElement | null {
  const { heading, subheading, columns = '3', items } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const filtered = (items ?? []).filter((it) => it?.title || it?.text);
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
        <div className={`grid grid-cols-1 gap-8 ${colClass}`}>
          {filtered.map((it, i) => {
            const Icon = it.icon ? ICONS[it.icon] : undefined;
            return (
              <div key={i} className="flex flex-col items-start">
                {Icon ? (
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-surface-raised text-accent">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                ) : null}
                {it.title ? <h3 className="font-display text-base font-semibold text-ink">{it.title}</h3> : null}
                {it.text ? <p className="mt-1.5 text-sm text-ink/60">{it.text}</p> : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
