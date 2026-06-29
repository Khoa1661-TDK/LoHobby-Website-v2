'use client';
// lib/animations/hooks/useRipple.ts — button press ripple (spec §4).
//
// Returns { ref, onPointerDown }. Spread onto a button (which must be
// position:relative + overflow:hidden). On press a circular ripple span is
// spawned at the pointer location, scales up and fades out, then is removed.
//
// Reduced motion: no ripple is created.

import { useCallback, useRef } from 'react';
import { animate } from 'motion';
import { prefersReducedMotion } from '@/lib/animations/config';

const RIPPLE_DURATION = 0.6; // seconds
/** Translucent white reads on the dark Add-to-Cart button; overridable via CSS var. */
const RIPPLE_COLOR = 'var(--ripple-color, rgba(255,255,255,0.35))';

export function useRipple<T extends HTMLElement = HTMLButtonElement>(): {
  ref: React.RefObject<T | null>;
  onPointerDown: (event: React.PointerEvent<T>) => void;
} {
  const ref = useRef<T | null>(null);

  const onPointerDown = useCallback((event: React.PointerEvent<T>) => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const rect = el.getBoundingClientRect();
    // Diameter covers the furthest corner from the press point.
    const size = Math.max(rect.width, rect.height) * 2;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.position = 'absolute';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.borderRadius = '50%';
    ripple.style.background = RIPPLE_COLOR;
    ripple.style.pointerEvents = 'none';
    ripple.style.transform = 'scale(0)';
    el.appendChild(ripple);

    const controls = animate(
      ripple,
      { transform: ['scale(0)', 'scale(1)'], opacity: [0.5, 0] },
      { duration: RIPPLE_DURATION, ease: 'easeOut' } as never,
    );
    controls.finished.then(() => ripple.remove()).catch(() => ripple.remove());
  }, []);

  return { ref, onPointerDown };
}
