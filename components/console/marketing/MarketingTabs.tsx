// components/console/marketing/MarketingTabs.tsx
//
// Tab strip for the marketing console. The one client component on the screen:
// it owns which tab is active and renders the matching panel. The panels are
// server components handed in already rendered, so the client boundary stays as
// small as possible — a client component cannot await a server data adapter.

'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

export type MarketingTabId = 'coupons' | 'gift-cards' | 'campaigns' | 'auto-sale';

const TABS: { id: MarketingTabId; label: string }[] = [
  { id: 'coupons', label: 'Mã giảm giá' },
  { id: 'gift-cards', label: 'Thẻ quà tặng' },
  { id: 'campaigns', label: 'Chiến dịch email' },
  { id: 'auto-sale', label: 'Tự động giảm giá' },
];

export function MarketingTabs({ panels }: { panels: Record<MarketingTabId, ReactNode> }) {
  const [active, setActive] = useState<MarketingTabId>('coupons');

  return (
    <div className="flex flex-col gap-4">
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
      {panels[active] ?? null}
    </div>
  );
}
