// lib/page-builder/feature-icons.ts — curated icon names for the Feature List block.
// Kept lucide-free so the Payload schema can import the options without bundling icons.
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
