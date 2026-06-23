// components/blocks/Stats.tsx — row/grid of big value + small label stats.
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';

type Stat = {
  value?: string | null;
  label?: string | null;
};

type Props = {
  heading?: string | null;
  items?: Stat[] | null;
} & BlockAppearance;

export default function StatsBlock(props: Props): ReactElement | null {
  const { heading, items } = props;
  const { section, container, style } = blockAppearanceClasses(props);

  const filtered = (items ?? []).filter((s) => s?.value || s?.label);
  if (filtered.length === 0 && !heading) return null;

  return (
    <section className={section} style={style}>
      <div className={container}>
        {heading ? (
          <h2 className="mb-10 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {heading}
          </h2>
        ) : null}
        {filtered.length > 0 ? (
          <dl className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {filtered.map((stat, i) => (
              <div key={i}>
                <dt className="font-display text-3xl font-bold tracking-tight md:text-4xl lg:text-5xl">
                  {stat.value}
                </dt>
                <dd className="mt-2 text-sm text-ink/60">{stat.label}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
