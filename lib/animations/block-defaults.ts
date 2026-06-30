// lib/animations/block-defaults.ts — block type → default preset mapping (spec §2).
//
// When a block's `scrollAnimation` is `'default'` or null, RevealOnScroll uses
// this map to pick a preset based on the block's type. Editors can override per
// block in the CMS; this is the designer-chosen baseline.

import type { PresetName } from './config';
import { normalizePreset } from './config';

/** Block slug (Payload blockType) → default preset. Keys match the `slug` of
 *  each block in src/payload/blocks/*.ts. */
export const BLOCK_DEFAULTS: Record<string, PresetName> = {
  hero: 'hero-entrance',
  featuredCollection: 'fade-up',
  featuredProducts: 'stagger-cards',
  richText: 'fade-up',
  imageWithText: 'slide-right',
  gallery: 'stagger-cards',
  testimonials: 'stagger-cards',
  logoCloud: 'fade-in',
  newsletter: 'scale-in',
  faq: 'stagger-list',
  promoBanner: 'fade-in',
  videoEmbed: 'scale-in',
  divider: 'fade-in',
  recommendations: 'stagger-cards',
  recentlyViewed: 'stagger-cards',
  button: 'scale-in',
  text: 'fade-up',
  socialBar: 'fade-in',
  spacer: 'none',
  columns: 'stagger-list',
  callToAction: 'scale-in',
  stats: 'stagger-list',
  quote: 'fade-up',
  cardGrid: 'stagger-cards',
  banner: 'fade-in',
  steps: 'stagger-list',
  pricingTable: 'stagger-cards',
  countdown: 'scale-in',
  tabs: 'fade-in',
  featureGrid: 'stagger-cards',
  productShowcase: 'stagger-cards',
  reels: 'stagger-cards',
};

/** Resolve the effective preset for a block.
 *
 *  - explicit preset name (incl. legacy aliases) wins
 *  - `'default'`, null, or an unknown value → block-type default
 *  - unknown block type with no explicit preset → `'fade-up'` (safe baseline)
 */
export function resolveBlockPreset(
  blockType: string | undefined,
  scrollAnimation: string | null | undefined,
): PresetName {
  // 'default' is the sentinel for "follow block type" — treat it as no override.
  if (scrollAnimation != null && scrollAnimation !== 'default') {
    const explicit = normalizePreset(scrollAnimation);
    if (explicit) return explicit;
  }
  if (blockType) {
    const fromMap = BLOCK_DEFAULTS[blockType];
    if (fromMap) return fromMap;
  }
  return 'fade-up';
}
