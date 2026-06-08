'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactElement } from 'react';

const PRESETS: { key: string; label: string }[] = [
  { key: 'month', label: 'Tháng này' },
  { key: '7d', label: '7 ngày' },
  { key: '30d', label: '30 ngày' },
  { key: '90d', label: '90 ngày' },
];

export function PeriodSelector(): ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get('period') ?? (params.get('from') ? 'custom' : 'month');

  const select = (key: string): void => {
    const next = new URLSearchParams(params.toString());
    next.delete('from');
    next.delete('to');
    if (key === 'month') next.delete('period');
    else next.set('period', key);
    router.replace(`${pathname}?${next.toString()}`);
  };

  return (
    <div className="dash__period-selector" role="group" aria-label="Khoảng thời gian">
      {PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          aria-pressed={active === p.key}
          className={active === p.key ? 'is-active' : ''}
          onClick={() => select(p.key)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default PeriodSelector;