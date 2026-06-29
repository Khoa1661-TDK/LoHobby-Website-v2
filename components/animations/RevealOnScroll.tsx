'use client';
// components/animations/RevealOnScroll.tsx — wraps children in a scroll-reveal
// using the Motion One preset system.
//
// Reads a preset name (from the CMS `scrollAnimation` field) plus the block type.
// When the preset is 'default' or null, it falls back to the block-type default
// in lib/animations/block-defaults.ts. 'none' renders children untouched.
//
// SSR/no-JS: children render visible; useReveal only hides+animates after mount.

import type { ReactElement, ReactNode } from 'react';
import { useReveal } from '@/lib/animations/hooks/useReveal';
import { resolveBlockPreset } from '@/lib/animations/block-defaults';

type Props = {
  /** Stored CMS value: a preset name, 'default', 'none', a legacy alias, or null. */
  animate?: string | null;
  /** Block slug used to resolve the default preset when `animate` is 'default'/null. */
  blockType?: string;
  children: ReactNode;
};

export default function RevealOnScroll({ animate, blockType, children }: Props): ReactElement {
  const preset = resolveBlockPreset(blockType, animate);
  const ref = useReveal<HTMLDivElement>(preset);

  // 'none' → no wrapper behaviour needed, but keep the element so layout is
  // identical whether or not animation is applied.
  return <div ref={ref}>{children}</div>;
}
