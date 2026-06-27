'use client';
import { useEffect, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

const ANIM_CLASS: Record<string, string> = {
  'reveal-up': 'motion-safe:animate-reveal-up',
  'reveal-right': 'motion-safe:animate-reveal-right',
  'scale-in': 'motion-safe:animate-scale-in',
};

type Props = { animate: string; children: ReactNode };

/** Reveal `children` with the chosen animation when they scroll into view.
 *  State stays 'idle' on the server and first paint, so without JS the content
 *  is always visible (no opacity-0 lock-in). On mount JS hides it, then the
 *  IntersectionObserver flips it to 'shown' once, triggering the animation. */
export default function RevealOnScroll({ animate, children }: Props): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<'idle' | 'hidden' | 'shown'>('idle');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setState('hidden');
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setState('shown');
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cls =
    state === 'hidden'
      ? 'opacity-0'
      : state === 'shown'
        ? (ANIM_CLASS[animate] ?? '')
        : '';

  return (
    <div ref={ref} className={cls}>
      {children}
    </div>
  );
}
