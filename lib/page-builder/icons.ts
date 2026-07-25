// lib/page-builder/icons.ts — curated lucide icon NAMES for page-builder blocks.
// Deliberately lucide-free: Payload block schemas import the option list, and pulling
// lucide-react into the Payload config would bundle every icon into the server build.
// The name -> component mapping lives in components/blocks/_icon.tsx.
//
// Every name below was verified against the installed lucide-react's PascalCase exports
// (node_modules/lucide-react/dist/lucide-react.d.ts) before being added here — see
// task-4-report.md for the full validation trail, including names dropped or renamed
// from the original draft list (e.g. `check-circle` -> `circle-check`, `bar-chart` ->
// `chart-column`; `verified` dropped, no matching icon exists).

export const BLOCK_ICON_GROUPS = {
  Commerce: [
    'truck', 'package', 'box', 'tag', 'shopping-cart', 'shopping-bag',
    'credit-card', 'receipt', 'gift', 'percent', 'store', 'wallet',
  ],
  Trust: [
    'shield', 'shield-check', 'award', 'badge-check', 'lock', 'thumbs-up',
    'star', 'heart', 'headphones', 'life-buoy', 'handshake',
  ],
  Making: [
    'printer', 'ruler', 'layers', 'wrench', 'palette', 'scissors',
    'hammer', 'recycle', 'leaf', 'sparkles', 'wand', 'brush',
  ],
  Interface: [
    'arrow-right', 'arrow-up-right', 'check', 'circle-check', 'circle-help',
    'clock', 'calendar', 'mail', 'phone', 'map-pin', 'globe', 'search',
    'zap', 'flame', 'trending-up', 'chart-column', 'users', 'user',
    'message-circle', 'bell', 'settings', 'refresh-cw', 'download', 'play',
    'image', 'video', 'file-text', 'book-open',
  ],
} as const satisfies Record<string, readonly string[]>;

export const BLOCK_ICON_NAMES = Object.values(BLOCK_ICON_GROUPS).flat();

export type BlockIconName = (typeof BLOCK_ICON_NAMES)[number];

/** Title-case a kebab name for the Payload select label: "shield-check" -> "Shield Check". */
function labelFor(name: string): string {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** Options for a Payload `select`, prefixed with their group so the list stays scannable. */
export const BLOCK_ICON_OPTIONS: { label: string; value: string }[] = Object.entries(
  BLOCK_ICON_GROUPS,
).flatMap(([group, names]) =>
  names.map((value) => ({ label: `${group} — ${labelFor(value)}`, value })),
);

/** Legacy camelCase names still present in stored featureGrid rows. Kept resolvable so
 *  existing content renders; deliberately not offered as new select options. */
export const LEGACY_ICON_ALIASES: Record<string, string> = {
  thumbsUp: 'thumbs-up',
};
