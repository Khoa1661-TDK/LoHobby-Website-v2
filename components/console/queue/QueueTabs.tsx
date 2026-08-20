// components/console/queue/QueueTabs.tsx
//
// Filter tab row for the crawl review queue. The one client component on the
// screen: it owns which tab is active. Tabs are inert until the data layer
// wires filtering up; the active state is presentational.

'use client';

import { useState } from 'react';

const TABS: { id: string; label: string }[] = [
  { id: 'all', label: 'Tất cả (118)' },
  { id: 'new', label: 'Mới (94)' },
  { id: 'changed', label: 'Đã thay đổi (21)' },
  { id: 'error', label: 'Lỗi (3)' },
];

export function QueueTabs() {
  const [active, setActive] = useState('all');

  return (
    <div className="flex items-center gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActive(tab.id)}
          className={`inline-flex items-center gap-1.5 rounded-[var(--adm-radius)] px-3 py-1.5 text-[12px] font-semibold transition ${
            active === tab.id
              ? 'border border-[var(--adm-line)] text-[var(--adm-ink)]'
              : 'border border-transparent text-[var(--adm-ink-3)] hover:text-[var(--adm-ink)]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
