// components/blocks/Spotlight.client.tsx — live countdown cells for the Spotlight deal.
'use client';
import { useEffect, useState, type ReactElement } from 'react';
import { computeRemaining, type Remaining } from './Countdown';

type Props = { targetDate: string; expiredText: string };

export default function SpotlightCountdown({ targetDate, expiredText }: Props): ReactElement | null {
  const target = Date.parse(targetDate);
  // Compute the first value during render (not in the effect) so the SERVER HTML
  // already contains the digits. This matters for the builder preview, which after
  // an edit injects this block as static, non-interactive HTML (see
  // components/page-builder/preview/BlockSlot.tsx) — without server-rendered numbers
  // the countdown would show empty cells there. The per-second effect below still
  // drives the live tick after hydration; the digit cells carry suppressHydrationWarning
  // because server- and client-computed seconds can differ by the render/parse delay.
  const [remaining, setRemaining] = useState<Remaining | null>(() =>
    Number.isFinite(target) ? computeRemaining(target, Date.now()) : null,
  );

  useEffect(() => {
    if (!Number.isFinite(target)) return;
    const tick = () => setRemaining(computeRemaining(target, Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!Number.isFinite(target)) return null;
  if (remaining?.done) {
    return <p className="text-sm opacity-70">{expiredText}</p>;
  }

  const units = remaining
    ? [
        { label: 'Days', value: remaining.days },
        { label: 'Hrs', value: remaining.hours },
        { label: 'Min', value: remaining.minutes },
        { label: 'Sec', value: remaining.seconds },
      ]
    : [];

  // Cells derive their border/fill from the shell's foreground (`currentColor`) via
  // color-mix, so the timer keeps contrast whether it sits on the default dark banner
  // (currentColor = light `text-surface`) or a light-background override (currentColor
  // = dark `text-ink`). Digits inherit currentColor directly for full contrast; labels
  // are dimmed with opacity rather than a fixed low-contrast white.
  return (
    <div className="flex items-center gap-2.5" suppressHydrationWarning>
      {units.map((u) => (
        <div
          key={u.label}
          className="min-w-[60px] rounded-card-sm border border-[color-mix(in_srgb,currentColor_24%,transparent)] bg-[color-mix(in_srgb,currentColor_8%,transparent)] px-3 py-2.5 text-center backdrop-blur"
        >
          <div className="font-display text-2xl font-bold tabular-nums" suppressHydrationWarning>
            {String(u.value).padStart(2, '0')}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-65">
            {u.label}
          </div>
        </div>
      ))}
    </div>
  );
}
