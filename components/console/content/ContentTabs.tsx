// components/console/content/ContentTabs.tsx
//
// Tab strip for the content screen (boards 13a + 13c). The one client component
// on the route: it owns which tab is active. Each panel is a server component
// passed as a child, so the client boundary stays a single thin strip — the
// panels render once and are only toggled in/out of the DOM.

'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

export type ContentTabId = 'pages' | 'redirects';

const TABS: { id: ContentTabId; label: string }[] = [
  { id: 'pages', label: 'Trang & bài viết' },
  { id: 'redirects', label: 'Chuyển hướng' },
];

export function ContentTabs({
  panels,
}: {
  panels: Record<ContentTabId, ReactNode>;
}) {
  const [active, setActive] = useState<ContentTabId>('pages');

  return (
    <div className="flex flex-col gap-3.5">
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
      {panels[active]}
    </div>
  );
}
