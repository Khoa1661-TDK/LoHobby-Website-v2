'use client';
// components/animations/PageTransition.tsx — entry-only route transition.
//
// On each route entry (the pathname changes, or first mount) the wrapped
// content fades and drifts in: opacity 0→1, y 8→0, 250ms ease-out (spec §3).
//
// Entry-only by design — Next.js 15 App Router has no reliable "before route
// change" hook without an extra dependency, so there is no exit animation. The
// keyed pathname forces a remount-style re-run of the effect on navigation.
//
// SSR/no-JS contract (mirrors useReveal): the content renders fully visible on
// the server and first paint. JS only sets the start state and animates after
// mount, so without JS nothing is ever locked at opacity 0.

import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { animate } from 'motion';
import { prefersReducedMotion } from '@/lib/animations/config';

const DURATION = 0.25; // seconds
const DRIFT = 8; // px

export default function PageTransition({ children }: { children: ReactNode }): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion: appear instantly, no movement.
    if (prefersReducedMotion()) {
      el.style.removeProperty('opacity');
      el.style.removeProperty('transform');
      return;
    }

    const controls = animate(
      el,
      { opacity: [0, 1], transform: [`translateY(${DRIFT}px)`, 'translateY(0)'] },
      { duration: DURATION, ease: 'easeOut' },
    );
    controls.finished
      .then(() => {
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
      })
      .catch(() => {
        // Cancelled (navigation mid-animation) — leave for next run/cleanup.
      });

    return () => controls.stop();
  }, [pathname]);

  return <div ref={ref}>{children}</div>;
}
