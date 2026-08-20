// components/console/ui/StatusPill.tsx
//
// The console's only chromatic element. Colour is confined to status by
// design, and confined to THIS component by construction: callers pick a
// tone, never a colour, so "pills only" stays enforceable.

import type { ReactNode } from 'react';

export type PillTone = 'ok' | 'wait' | 'fail' | 'busy' | 'neutral';

/** Tone -> the three custom properties .adm-pill reads. */
const TONE_VARS: Record<PillTone, Record<string, string>> = {
  ok: {
    '--adm-pill-bg': 'var(--adm-ok-bg)',
    '--adm-pill-ink': 'var(--adm-ok-ink)',
    '--adm-pill-dot': 'var(--adm-ok-dot)',
  },
  wait: {
    '--adm-pill-bg': 'var(--adm-wait-bg)',
    '--adm-pill-ink': 'var(--adm-wait-ink)',
    '--adm-pill-dot': 'var(--adm-wait-dot)',
  },
  fail: {
    '--adm-pill-bg': 'var(--adm-fail-bg)',
    '--adm-pill-ink': 'var(--adm-fail-ink)',
    '--adm-pill-dot': 'var(--adm-fail-dot)',
  },
  busy: {
    '--adm-pill-bg': 'var(--adm-busy-bg)',
    '--adm-pill-ink': 'var(--adm-busy-ink)',
    '--adm-pill-dot': 'var(--adm-busy-dot)',
  },
  neutral: {
    '--adm-pill-bg': 'var(--adm-raised)',
    '--adm-pill-ink': 'var(--adm-ink-3)',
    '--adm-pill-dot': 'var(--adm-ink-4)',
  },
};

export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span className="adm-pill" style={TONE_VARS[tone] as React.CSSProperties}>
      {children}
    </span>
  );
}
