'use client';
// lib/animations/hooks/useBumpPulse.ts — quantity bump pulse (spec §4).
//
// Returns a ref to attach to a number/badge element. Whenever `value` changes
// the element pulses: scale 1 → 1.2 → 1 with a brief accent-colour flash, then
// the original colour is restored. Used by the cart quantity number and the
// navbar cart badge.
//
// Reduced motion: no animation — the number just updates.

import { useEffect, useRef } from 'react';
import { animate } from 'motion';
import { prefersReducedMotion } from '@/lib/animations/config';

const ACCENT = '#e46a41'; // terracotta-500
const PULSE_DURATION = 0.2; // seconds

export function useBumpPulse<T extends HTMLElement = HTMLElement>(
  value: number,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return;
    previous.current = value;

    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const originalColor = el.style.color;
    const controls = animate(
      el,
      {
        transform: ['scale(1)', 'scale(1.2)', 'scale(1)'],
        color: [originalColor || 'currentColor', ACCENT, originalColor || 'currentColor'],
      },
      { duration: PULSE_DURATION, ease: 'easeOut' } as never,
    );
    controls.finished
      .then(() => {
        // Restore so we don't leave an inline colour overriding theme classes.
        if (originalColor) el.style.color = originalColor;
        else el.style.removeProperty('color');
      })
      .catch(() => {
        if (originalColor) el.style.color = originalColor;
        else el.style.removeProperty('color');
      });

    return () => controls.stop();
  }, [value]);

  return ref;
}
