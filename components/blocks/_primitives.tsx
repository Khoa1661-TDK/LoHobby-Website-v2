// components/blocks/_primitives.tsx — shared maker-identity presentational primitives.
import React from 'react';
import type { ReactElement, ReactNode } from 'react';

/** Mono "build data" label used for eyebrows and spec strips. */
export function SpecTag({ children }: { children: ReactNode }): ReactElement {
  return (
    <span className="font-mono text-xs uppercase tracking-[0.18em] text-accent">
      {children}
    </span>
  );
}

/** Faint slicer-bed grid; purely decorative background. */
export function BuildPlateGrid({ className = '' }: { className?: string }): ReactElement {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 opacity-[0.06] ${className}`}
      style={{
        backgroundImage:
          'linear-gradient(var(--ink) 1px, transparent 1px), linear-gradient(90deg, var(--ink) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  );
}

/** Layer-line section divider; animates "print-in" unless reduced motion. */
export function LayerLineDivider(): ReactElement {
  return (
    <div
      aria-hidden="true"
      className="h-3 w-full motion-safe:animate-draw-line"
      style={{
        backgroundImage:
          'repeating-linear-gradient(to bottom, var(--line) 0, var(--line) 1px, transparent 1px, transparent 4px)',
      }}
    />
  );
}
