// components/blocks/PricingTable.tsx — tiered pricing cards.
import type { ReactElement } from 'react';
import Link from 'next/link';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Feature = { text?: string | null };
type Tier = {
  name?: string | null;
  price?: string | null;
  period?: string | null;
  description?: string | null;
  features?: Feature[] | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  highlighted?: boolean | null;
};
type Props = {
  heading?: string | null;
  subheading?: string | null;
  tiers?: Tier[] | null;
} & BlockAppearance;

export default function PricingTableBlock(props: Props): ReactElement | null {
  const { heading, subheading, tiers } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const filtered = (tiers ?? []).filter((t) => t?.name || t?.price);
  if (filtered.length === 0) return null;

  const cols =
    filtered.length >= 3 ? 'md:grid-cols-3' : filtered.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1';

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
        <div className={`grid grid-cols-1 gap-6 ${cols}`}>
          {filtered.map((tier, i) => (
            <div
              key={i}
              className={`flex flex-col rounded-2xl border p-6 ${
                tier.highlighted ? 'border-accent shadow-soft-lg' : 'border-line'
              }`}
            >
              <h3 className="font-display text-lg font-semibold text-ink">{tier.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold tracking-tight">{tier.price}</span>
                {tier.period ? <span className="text-sm text-ink/50">/{tier.period}</span> : null}
              </div>
              {tier.description ? <p className="mt-2 text-sm text-ink/60">{tier.description}</p> : null}
              {tier.features && tier.features.length > 0 ? (
                <ul className="mt-5 space-y-2 text-sm text-ink/70">
                  {tier.features
                    .filter((f) => f?.text)
                    .map((f, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <span aria-hidden="true" className="mt-0.5 text-accent">✓</span>
                        <span>{f.text}</span>
                      </li>
                    ))}
                </ul>
              ) : null}
              {tier.ctaLabel && tier.ctaHref ? (
                <Link
                  href={tier.ctaHref}
                  {...linkAttrs(tier.ctaHref)}
                  className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium transition ${
                    tier.highlighted
                      ? 'bg-ink text-surface hover:opacity-90'
                      : 'border border-line text-ink hover:bg-surface-raised'
                  }`}
                >
                  {tier.ctaLabel}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
