import { describe, expect, it } from 'vitest';
import { fontCssVariables, resolveFontPreset } from '@/lib/store-fonts';

describe('store-fonts', () => {
  it('defaults to inter preset', () => {
    expect(resolveFontPreset(undefined)).toBe('inter');
  });

  it('exports active font CSS variables', () => {
    const vars = fontCssVariables('jakarta');
    expect(vars['--font-sans-active']).toContain('jakarta');
  });

  it('pins display + logo fonts to the brand fonts regardless of sans preset', () => {
    const vars = fontCssVariables('roboto');
    expect(vars['--font-display-active']).toContain('archivo');
    expect(vars['--font-logo-active']).toContain('playfair');
  });
});
