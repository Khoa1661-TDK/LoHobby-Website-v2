// components/console/ui/Card.tsx
//
// The raised panel every screen is built from: 1px line on the surface
// colour, 3px radius, no shadow. Shadowless is deliberate — the canvas
// separates planes with the line, not with elevation.

import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] ${
        padded ? 'p-4' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
