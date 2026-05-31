// lib/store-fonts.ts — font preset options for white-label storefronts

export const FONT_PRESET_VALUES = ['jakarta', 'inter', 'roboto', 'system'] as const;

export type FontPreset = (typeof FONT_PRESET_VALUES)[number];

export type FontPresetConfig = {
  label: string;
  sansVar: string;
  serifVar: string;
};

export const FONT_PRESETS: Record<FontPreset, FontPresetConfig> = {
  jakarta: {
    label: 'Plus Jakarta Sans + Fraunces (default)',
    sansVar: 'var(--font-jakarta)',
    serifVar: 'var(--font-fraunces)',
  },
  inter: {
    label: 'Inter',
    sansVar: 'var(--font-inter)',
    serifVar: 'var(--font-inter)',
  },
  roboto: {
    label: 'Roboto',
    sansVar: 'var(--font-roboto)',
    serifVar: 'Georgia, "Times New Roman", serif',
  },
  system: {
    label: 'System fonts',
    sansVar: 'system-ui, -apple-system, Segoe UI, sans-serif',
    serifVar: 'Georgia, "Times New Roman", serif',
  },
};

export function resolveFontPreset(raw: unknown): FontPreset {
  if (typeof raw === 'string' && FONT_PRESET_VALUES.includes(raw as FontPreset)) {
    return raw as FontPreset;
  }
  return 'jakarta';
}

export function fontCssVariables(preset: FontPreset): Record<string, string> {
  const config = FONT_PRESETS[preset];
  return {
    '--font-sans-active': config.sansVar,
    '--font-serif-active': config.serifVar,
  };
}
