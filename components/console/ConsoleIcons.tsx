// components/console/ConsoleIcons.tsx
//
// Stroke icons for the admin console. One component, one lookup keyed by
// ConsoleIconName. The search icon uses a heavier stroke (2) per the design;
// everything else is 1.8.

import type { ReactNode } from 'react';
import type { ConsoleIconName } from './nav';

const ICON_BODIES: Record<ConsoleIconName, ReactNode> = {
  products: (
    <>
      <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
      <line x1="3" y1="8" x2="12" y2="13" />
      <line x1="21" y1="8" x2="12" y2="13" />
      <line x1="12" y1="13" x2="12" y2="21" />
    </>
  ),
  categories: (
    <>
      <polygon points="12 3 21 8 12 13 3 8 12 3" />
      <polyline points="3 13 12 18 21 13" />
    </>
  ),
  media: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  crawl: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="3" x2="12" y2="7" />
    </>
  ),
  queue: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </>
  ),
  orders: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.3" />
    </>
  ),
  reviews: (
    <polygon points="12 2 15 9 22 9.5 16.5 14 18 21 12 17 6 21 7.5 14 2 9.5 9 9" />
  ),
  pages: (
    <>
      <path d="M6 2h9l5 5v15H6Z" />
      <polyline points="15 2 15 7 20 7" />
    </>
  ),
  marketing: (
    <>
      <path d="M3 10v4h3l6 4V6l-6 4H3Z" />
      <path d="M17 9a4 4 0 0 1 0 6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  theme: (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
    </>
  ),
  assistant: (
    <>
      <rect x="4" y="7" width="16" height="12" rx="2" />
      <circle cx="9" cy="13" r="1.1" fill="currentColor" />
      <circle cx="15" cy="13" r="1.1" fill="currentColor" />
      <line x1="12" y1="7" x2="12" y2="3" />
    </>
  ),
};

const ICON_STROKE: Partial<Record<ConsoleIconName, number>> = {
  search: 2,
};

export function ConsoleIcon({ name, size = 16 }: { name: ConsoleIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON_STROKE[name] ?? 1.8}
      aria-hidden="true"
    >
      {ICON_BODIES[name]}
    </svg>
  );
}
