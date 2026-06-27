// components/blocks/Countdown.tsx — live ticking countdown.
'use client';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import Link from 'next/link';
import type { BlockAppearance } from '@/lib/page-builder';
import { blockAppearanceClasses } from '@/lib/page-builder';
import { linkAttrs } from '@/lib/page-builder/link';

type Props = {
  heading?: string | null;
  targetDate?: string | null;
  expiredText?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
} & BlockAppearance;

export type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

export function computeRemaining(target: number, now: number): Remaining {
  const diff = Math.max(0, target - now);
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor(diff / (1000 * 60 * 60)) % 24,
    minutes: Math.floor(diff / (1000 * 60)) % 60,
    seconds: Math.floor(diff / 1000) % 60,
    done: diff <= 0,
  };
}

export default function CountdownBlock(props: Props): ReactElement | null {
  const { heading, targetDate, expiredText, ctaLabel, ctaHref } = props;
  const { section, container, style } = blockAppearanceClasses(props);
  const target = targetDate ? Date.parse(targetDate) : Number.NaN;
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const tick = () => setRemaining(computeRemaining(target, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!Number.isFinite(target)) return null;

  const units = remaining
    ? [
        { label: 'Days', value: remaining.days },
        { label: 'Hours', value: remaining.hours },
        { label: 'Minutes', value: remaining.minutes },
        { label: 'Seconds', value: remaining.seconds },
      ]
    : [];

  return (
    <section className={section} style={style}>
      <div className={container}>
        {heading ? (
          <h2 className="mb-8 font-display text-2xl font-bold tracking-tight md:text-3xl">{heading}</h2>
        ) : null}
        {remaining?.done ? (
          <p className="text-lg text-ink/70">{expiredText}</p>
        ) : (
          <div className="flex items-center justify-center gap-4 md:gap-6" suppressHydrationWarning>
            {units.map((u) => (
              <div key={u.label} className="min-w-[64px] rounded-xl border border-line px-3 py-4">
                <div className="font-display text-3xl font-bold tabular-nums md:text-4xl">
                  {String(u.value).padStart(2, '0')}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-ink/50">{u.label}</div>
              </div>
            ))}
          </div>
        )}
        {!remaining?.done && ctaLabel && ctaHref ? (
          <Link
            href={ctaHref}
            {...linkAttrs(ctaHref)}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-medium text-surface transition hover:opacity-90"
          >
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
