'use client';
// components/animations/OrderTimeline.tsx — animated order-status step progress.
//
// Replaces the static progress dots on the order detail page. Steps animate
// sequentially on mount (one at a time, no overlap — spec §4 "Checkout Step
// Progress"):
//   • complete step (index < current): dot fills + an SVG checkmark morphs in
//   • active step  (index === current): dot scales 1→1.15 and fills accent
//   • inactive step (index > current): stays dim, no animation
//
// SSR/no-JS contract: every step renders in its final visual state on the
// server (done dots filled, checkmarks present). JS only re-plays the reveal
// after mount, so without JS the progress is still correct and readable.
//
// Reduced motion: instant — final state, no scale/morph sequencing.

import { useEffect, useRef, type ReactElement } from 'react';
import { animate } from 'motion';
import { prefersReducedMotion } from '@/lib/animations/config';

export type TimelineStep = {
  /** Stable key for the step (e.g. 'pending'). */
  key: string;
  /** Human label shown next to the dot. */
  label: string;
};

type Props = {
  steps: TimelineStep[];
  /** Index of the current step; steps before it are complete, after are pending. */
  currentStep: number;
};

const STEP_STAGGER = 0.25; // seconds between sequential step animations

export default function OrderTimeline({ steps, currentStep }: Props): ReactElement {
  const rootRef = useRef<HTMLOListElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion()) return;

    const dots = Array.from(
      root.querySelectorAll<HTMLElement>('[data-timeline-dot]'),
    );
    const checks = Array.from(
      root.querySelectorAll<SVGPathElement>('[data-timeline-check]'),
    );

    const controls = dots.map((dot, index) => {
      const delay = index * STEP_STAGGER;
      if (index < currentStep) {
        return animate(
          dot,
          { transform: ['scale(0.6)', 'scale(1)'], opacity: [0, 1] },
          { duration: 0.3, delay, ease: 'easeOut' } as never,
        );
      }
      if (index === currentStep) {
        return animate(
          dot,
          { transform: ['scale(1)', 'scale(1.15)', 'scale(1)'], opacity: [0.4, 1] },
          { duration: 0.4, delay, ease: [0.34, 1.56, 0.64, 1] } as never,
        );
      }
      return null;
    });

    // Checkmark path morph (draw-on) for completed steps, after their dot fills.
    const checkControls = checks.map((path, index) => {
      const len = path.getTotalLength?.() ?? 24;
      path.style.strokeDasharray = String(len);
      return animate(
        path,
        { strokeDashoffset: [len, 0] },
        { duration: 0.4, delay: index * STEP_STAGGER + 0.15, ease: 'easeOut' } as never,
      );
    });

    return () => {
      for (const c of controls) c?.stop();
      for (const c of checkControls) c.stop();
    };
  }, [currentStep, steps.length]);

  return (
    <ol ref={rootRef} className="mt-8 flex flex-wrap gap-4">
      {steps.map((step, index) => {
        const complete = index < currentStep;
        const active = index === currentStep;
        const done = complete || active;
        return (
          <li key={step.key} className="flex items-center gap-2 text-sm">
            <span
              data-timeline-dot
              className={`relative flex h-4 w-4 items-center justify-center rounded-full ${
                done ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              {complete ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-2.5 w-2.5"
                  fill="none"
                  stroke="white"
                  strokeWidth={3}
                  aria-hidden="true"
                >
                  <path
                    data-timeline-check
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : null}
            </span>
            <span className={done ? 'font-medium' : 'text-neutral-500'}>{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
