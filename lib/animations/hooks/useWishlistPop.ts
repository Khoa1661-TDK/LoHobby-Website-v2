'use client';
// lib/animations/hooks/useWishlistPop.ts — heart toggle spring (spec §4).
//
// Returns a ref to attach to the heart SVG (or any element). When `saved`
// flips, the element pops:
//   • add (false→true):  scale 1 → 1.3 → 1   (spring-ish overshoot)
//   • remove (true→false): scale 1 → 0.8 → 1 (shrink, settle)
// The fill-colour transition is handled by the component's CSS classes; this
// hook only drives the scale. The first render does NOT animate (no pop on
// initial mount / hydration of an already-saved item).
//
// Reduced motion: no scale animation — the CSS fill toggle is the only feedback.

import { useEffect, useRef } from 'react';
import { animate } from 'motion';
import { prefersReducedMotion } from '@/lib/animations/config';

export function useWishlistPop<T extends Element = HTMLElement>(
  saved: boolean,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const mounted = useRef(false);

  useEffect(() => {
    // Skip the initial render so a pre-saved item doesn't pop on mount.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const keyframes = saved
      ? { transform: ['scale(1)', 'scale(1.3)', 'scale(1)'] }
      : { transform: ['scale(1)', 'scale(0.8)', 'scale(1)'] };

    const controls = animate(el, keyframes, {
      duration: saved ? 0.4 : 0.25,
      ease: [0.34, 1.56, 0.64, 1],
    } as never);

    return () => controls.stop();
  }, [saved]);

  return ref;
}
