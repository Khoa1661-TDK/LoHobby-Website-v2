// lib/store-fonts.ts — font preset options for white-label storefronts

export const FONT_PRESET_VALUES = ['inter', 'jakarta', 'roboto', 'system'] as const;

export type FontPreset = (typeof FONT_PRESET_VALUES)[number];

export type FontPresetConfig = {
  label: string;
  sansVar: string;
};

export const FONT_PRESETS: Record<FontPreset, FontPresetConfig> = {
  inter: {
    label: 'Inter (Lô Hobby default)',
    sansVar: 'var(--font-inter)',
  },
  jakarta: {
    label: 'Plus Jakarta Sans',
    sansVar: 'var(--font-jakarta)',
  },
  roboto: {
    label: 'Roboto',
    sansVar: 'var(--font-roboto)',
  },
  system: {
    label: 'System fonts',
    sansVar: 'system-ui, -apple-system, Segoe UI, sans-serif',
  },
};

export function resolveFontPreset(raw: unknown): FontPreset {
  if (typeof raw === 'string' && FONT_PRESET_VALUES.includes(raw as FontPreset)) {
    return raw as FontPreset;
  }
  return 'inter';
}

export function fontCssVariables(preset: FontPreset): Record<string, string> {
  const config = FONT_PRESETS[preset];
  return {
    // Body / UI text — admin-selectable per store.
    '--font-sans-active': config.sansVar,
    // Display headings + serif logo wordmark are part of the Lô Hobby brand
    // identity and stay fixed regardless of the sans preset.
    '--font-display-active': 'var(--font-archivo)',
    '--font-logo-active': 'var(--font-playfair)',
    '--font-serif-active': 'var(--font-playfair)',
    '--font-mono-active': 'var(--font-space-mono)',
  };
}
