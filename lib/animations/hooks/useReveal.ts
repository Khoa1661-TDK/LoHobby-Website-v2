'use client';
// lib/animations/hooks/useReveal.ts — scroll reveal via IntersectionObserver +
// Motion One, one-shot.
//
// SSR/no-JS contract: the element renders fully visible on the server and on
// first paint. JS only hides it (sets the keyframe start values) once mounted,
// then animates to the end state when it scrolls into view. Without JS the
// content is never opacity-0 locked.

import { useEffect, useRef } from 'react';
import { animate, stagger } from 'motion';
import type { AnimationPreset, PresetName } from '../config';
import { OBSERVER_CONFIG, PRESETS, prefersReducedMotion, reduceMotion } from '../config';

/** Apply the keyframe START values to an element so it sits in its pre-animation
 *  state before revealing. Mirrors the `from` of each preset keyframe. */
function applyStartState(el: HTMLElement, keyframes: AnimationPreset['keyframes']): void {
  for (const [prop, frames] of Object.entries(keyframes)) {
    const start = frames[0];
    if (prop === 'transform') {
      el.style.transform = String(start);
    } else {
      el.style.setProperty(prop, String(start));
    }
  }
}

/** Clear inline styles we set, letting the element rest at its natural state
 *  after the animation finishes. */
function clearInlineState(el: HTMLElement, keyframes: AnimationPreset['keyframes']): void {
  for (const prop of Object.keys(keyframes)) {
    if (prop === 'transform') {
      el.style.removeProperty('transform');
    } else {
      el.style.removeProperty(prop);
    }
  }
}

/** Returns a ref to attach to the element that should reveal on scroll.
 *  `preset` is the already-resolved preset name (never 'default'). */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  preset: PresetName,
): React.RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || preset === 'none') return;

    const base = PRESETS[preset];
    if (!base) return;

    const reduced = prefersReducedMotion();
    const active = reduced ? reduceMotion(base) : base;

    // Targets: children for stagger presets, else the element itself.
    const isStagger = !reduced && !!base.staggerChildren;
    const targets = isStagger
      ? (Array.from(el.children) as HTMLElement[])
      : [el];

    // Pre-animation state: hide each target at the keyframe start.
    for (const t of targets) applyStartState(t, active.keyframes);

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.disconnect();

        const options: Parameters<typeof animate>[2] = {
          duration: active.duration,
          ease: active.easing as never,
        };
        if (isStagger && base.staggerChildren) {
          (options as { delay?: unknown }).delay = stagger(base.staggerChildren);
        }

        const controls = animate(targets, active.keyframes as never, options);
        controls.finished
          .then(() => {
            for (const t of targets) clearInlineState(t, active.keyframes);
          })
          .catch(() => {
            // Animation cancelled (e.g. unmount) — leave styles for cleanup below.
          });
        break;
      }
    }, OBSERVER_CONFIG);

    observer.observe(el);
    return () => observer.disconnect();
  }, [preset]);

  return ref;
}
