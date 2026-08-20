// components/console/dashboard/RangeSelector.tsx
//
// The one interactive element on the dashboard: a segmented 7/30/90-day range
// selector. Client-only because it holds the selected range in local state;
// selecting a range changes nothing else yet — the fixture numbers stay put.

'use client';

import { useState } from 'react';

const RANGES = ['7 ngày', '30 ngày', '90 ngày'] as const;

export type RangeValue = (typeof RANGES)[number];

export function RangeSelector() {
  const [range, setRange] = useState<RangeValue>('7 ngày');

  return (
    <div className="flex border border-[var(--adm-line)]">
      {RANGES.map((label) => {
        const active = label === range;
        return (
          <button
            key={label}
            type="button"
            onClick={() => setRange(label)}
            className={`px-3 py-1.5 text-[11px] font-semibold ${
              active
                ? 'bg-[var(--adm-action)] text-[var(--adm-action-ink)]'
                : 'text-[var(--adm-ink-3)]'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
