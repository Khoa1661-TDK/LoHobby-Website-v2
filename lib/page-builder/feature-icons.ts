// lib/page-builder/feature-icons.ts — legacy alias for the Feature List block's icon set.
// Superseded by lib/page-builder/icons.ts. Kept so the FeatureGrid schema and stored rows
// keep working without a data migration; new blocks should import BLOCK_ICON_OPTIONS.
export const FEATURE_ICON_NAMES = [
  'zap', 'truck', 'shield', 'star',
  'box', 'layers', 'printer', 'sparkles',
  'heart', 'clock', 'award', 'package',
  'wrench', 'ruler', 'palette', 'thumbsUp',
] as const;

export type FeatureIconName = (typeof FEATURE_ICON_NAMES)[number];

export const FEATURE_ICON_OPTIONS = FEATURE_ICON_NAMES.map((value) => ({
  label: value.charAt(0).toUpperCase() + value.slice(1),
  value,
}));
