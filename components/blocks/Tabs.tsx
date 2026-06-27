// components/blocks/Tabs.tsx — tabs or accordion, switched by variant.
'use client';
import { useState } from 'react';
import type { ReactElement } from 'react';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { renderLexical } from './_primitives';

type Item = { label?: string | null; content?: Record<string, unknown> | null };
type Props = {
  variant?: 'tabs' | 'accordion' | null;
  heading?: string | null;
  items?: Item[] | null;
} & BlockAppearance;

export default function TabsBlock(props: Props): ReactElement | null {
  const { variant = 'tabs', heading, items } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const [active, setActive] = useState(0);
  const [openSet, setOpenSet] = useState<Record<number, boolean>>({ 0: true });

  const filtered = (items ?? []).filter((it) => it?.label);
  if (filtered.length === 0) return null;

  return (
    <section className={section} style={style}>
      <div className={container}>
        {heading ? (
          <h2 className="mb-8 text-center font-display text-2xl font-bold tracking-tight md:text-3xl">
            {heading}
          </h2>
        ) : null}

        {variant === 'accordion' ? (
          <div className="mx-auto max-w-2xl space-y-3">
            {filtered.map((it, i) => {
              const open = Boolean(openSet[i]);
              return (
                <div key={i} className="rounded-xl border border-line">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpenSet((s) => ({ ...s, [i]: !s[i] }))}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left font-medium text-ink"
                  >
                    {it.label}
                    <span aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </button>
                  {open ? (
                    <div className="px-5 pb-4 text-sm text-ink/70">
                      {it.content ? renderLexical(it.content) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl">
            <div role="tablist" className="flex flex-wrap gap-2 border-b border-line">
              {filtered.map((it, i) => (
                <button
                  key={i}
                  role="tab"
                  type="button"
                  aria-selected={active === i}
                  onClick={() => setActive(i)}
                  className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                    active === i
                      ? 'border-ink text-ink'
                      : 'border-transparent text-ink/50 hover:text-ink'
                  }`}
                >
                  {it.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="pt-6 text-sm text-ink/70">
              {filtered[active]?.content ? renderLexical(filtered[active].content) : null}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
