// lib/theme-presets.ts — page builder theme presets
import type { BlockAppearance } from '@/lib/page-builder';

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  fontPreset: 'jakarta' | 'fraunces' | 'inter' | 'roboto';
  defaultBlockAppearance: BlockAppearance;
};

export const themePresets: Record<string, ThemePreset> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description:
      'Clean, airy layout with generous whitespace. Ideal for modern brands.',
    primaryColor: '#000000',
    secondaryColor: '#737373',
    fontPreset: 'inter',
    defaultBlockAppearance: {
      background: 'theme',
      containerWidth: 'narrow',
      paddingY: 'spacious',
    },
  },
  bold: {
    id: 'bold',
    name: 'Bold',
    description:
      'High-contrast, impactful sections. Great for promos and streetwear.',
    primaryColor: '#1a1a1a',
    secondaryColor: '#e46a41',
    fontPreset: 'jakarta',
    defaultBlockAppearance: {
      background: 'dark',
      containerWidth: 'wide',
      paddingY: 'base',
    },
  },
  editorial: {
    id: 'editorial',
    name: 'Editorial',
    description:
      'Warm, serif-driven typography with elegant spacing. Perfect for storytelling.',
    primaryColor: '#3d3732',
    secondaryColor: '#e46a41',
    fontPreset: 'fraunces',
    defaultBlockAppearance: {
      background: 'light',
      containerWidth: 'normal',
      paddingY: 'base',
    },
  },
};

export function getThemePreset(id: string): ThemePreset | undefined {
  return themePresets[id];
}

export function getDefaultBlockAppearance(
  presetId?: string,
): BlockAppearance {
  if (presetId && themePresets[presetId]) {
    return themePresets[presetId].defaultBlockAppearance;
  }
  return {
    background: 'theme',
    containerWidth: 'normal',
    paddingY: 'base',
  };
}