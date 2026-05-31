import { describe, expect, it } from 'vitest';
import { fontCssVariables, resolveFontPreset } from '@/lib/store-fonts';

describe('store-fonts', () => {
  it('defaults to jakarta preset', () => {
    expect(resolveFontPreset(undefined)).toBe('jakarta');
  });

  it('exports active font CSS variables', () => {
    const vars = fontCssVariables('inter');
    expect(vars['--font-sans-active']).toContain('inter');
  });
});
