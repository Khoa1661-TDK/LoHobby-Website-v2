// components/console/reviews/ReviewTabs.tsx
//
// Tab strip for the reviews & messages screen (board 15b). The one client
// component on the route: it owns which queue is active. The queues are server
// components passed as children, so the client boundary stays a single thin
// strip — the panels render once and are only toggled in/out of the DOM.

'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

export type ReviewTabId = 'reviews' | 'favourites' | 'newsletter' | 'messages';

const TABS: { id: ReviewTabId; label: string }[] = [
  { id: 'reviews', label: 'Đánh giá chờ duyệt (14)' },
  { id: 'favourites', label: 'Danh sách yêu thích' },
  { id: 'newsletter', label: 'Đăng ký bản tin' },
  { id: 'messages', label: 'Tin nhắn liên hệ (5)' },
];

export function ReviewTabs({
  panels,
}: {
  panels: Record<ReviewTabId, ReactNode>;
}) {
  const [active, setActive] = useState<ReviewTabId>('reviews');

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`inline-flex items-center rounded-[var(--adm-radius)] px-3 py-[7px] text-[11px] font-semibold transition ${
              active === tab.id
                ? 'border border-[var(--adm-line)] bg-[var(--adm-action)] text-[var(--adm-action-ink)]'
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
