// lib/animations/config.ts — animation preset definitions (Motion One params).
//
// Single source of truth for what each named preset does: keyframes, timing,
// easing, and stagger behaviour. Designers own these values; CMS editors only
// pick a preset name (see lib/animations/block-defaults.ts and spec §5).
//
// prefers-reduced-motion is enforced HERE, once, via `reduceMotion()` — not in
// each component. When reduced motion is active every preset collapses to an
// opacity-only, zero-duration reveal (or skips movement entirely).

/** All selectable preset names. `'none'` means "no animation, instant render". */
export type PresetName =
  | 'none'
  | 'fade-up'
  | 'fade-in'
  | 'slide-right'
  | 'scale-in'
  | 'stagger-cards'
  | 'stagger-list'
  | 'hero-entrance';

/** A keyframe set is a map of CSS/transform properties to their [from, to]
 *  value arrays, in Motion One's keyframe form. */
export type Keyframes = Record<string, Array<string | number>>;

export type AnimationPreset = {
  /** Keyframes applied to the revealed element (or each child, when staggered). */
  keyframes: Keyframes;
  /** Duration in seconds (Motion One uses seconds, not ms). */
  duration: number;
  /** Easing — cubic-bezier array, named easing, or 'spring' (mapped at runtime). */
  easing: [number, number, number, number] | string;
  /** When set, children of the target are animated individually with this
   *  inter-child delay (seconds). Used by the stagger-* presets. */
  staggerChildren?: number;
};

/** The 7 motion presets from spec §2. `'none'` is handled before we ever look
 *  one up, so it has no entry here. */
export const PRESETS: Record<Exclude<PresetName, 'none'>, AnimationPreset> = {
  'fade-up': {
    keyframes: { opacity: [0, 1], transform: ['translateY(24px)', 'translateY(0)'] },
    duration: 0.6,
    easing: [0.16, 1, 0.3, 1],
  },
  'fade-in': {
    keyframes: { opacity: [0, 1] },
    duration: 0.5,
    easing: 'ease-out',
  },
  'slide-right': {
    keyframes: { opacity: [0, 1], transform: ['translateX(-32px)', 'translateX(0)'] },
    duration: 0.5,
    easing: [0.16, 1, 0.3, 1],
  },
  'scale-in': {
    keyframes: { opacity: [0, 1], transform: ['scale(0.92)', 'scale(1)'] },
    duration: 0.4,
    easing: [0.34, 1.56, 0.64, 1],
  },
  'stagger-cards': {
    keyframes: { opacity: [0, 1], transform: ['scale(0.92)', 'scale(1)'] },
    duration: 0.4,
    easing: [0.34, 1.56, 0.64, 1],
    staggerChildren: 0.08,
  },
  'stagger-list': {
    keyframes: { opacity: [0, 1], transform: ['translateY(24px)', 'translateY(0)'] },
    duration: 0.4,
    easing: 'ease-out',
    staggerChildren: 0.06,
  },
  'hero-entrance': {
    keyframes: {
      opacity: [0, 1],
      transform: ['translateY(40px) scale(0.97)', 'translateY(0) scale(1)'],
    },
    duration: 0.8,
    easing: [0.16, 1, 0.3, 1],
  },
};

/** IntersectionObserver config (spec §2). One-shot: caller disconnects after the
 *  first intersection. */
export const OBSERVER_CONFIG: IntersectionObserverInit = {
  rootMargin: '0px 0px -10% 0px',
  threshold: 0.05,
};

/** Legacy stored values from the pre-Motion-One CSS system map onto the closest
 *  new preset, so existing CMS pages keep animating after the rename. */
const LEGACY_ALIASES: Record<string, PresetName> = {
  'reveal-up': 'fade-up',
  'reveal-right': 'slide-right',
  // 'scale-in' is unchanged — still a valid PresetName.
};

const VALID_PRESETS = new Set<string>([
  'none',
  ...Object.keys(PRESETS),
]);

/** Normalise any stored/prop string to a known PresetName. Unknown strings and
 *  null fall back to `null` so the caller can apply its block-type default. */
export function normalizePreset(value: string | null | undefined): PresetName | null {
  if (value == null) return null;
  if (LEGACY_ALIASES[value]) return LEGACY_ALIASES[value];
  if (VALID_PRESETS.has(value)) return value as PresetName;
  return null;
}

/** True when the user has asked the OS to minimise non-essential motion.
 *  Guarded for SSR (no `window`). */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Reduced-motion transform of a preset: durations collapse to 0 and all
 *  transform keyframes are stripped, leaving an opacity-only instant reveal.
 *  Single enforcement point for accessibility (spec §1). */
export function reduceMotion(preset: AnimationPreset): AnimationPreset {
  return {
    keyframes: { opacity: [0, 1] },
    duration: 0,
    easing: 'linear',
    // stagger dropped — everything appears at once.
  };
}
