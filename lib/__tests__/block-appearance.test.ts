import { describe, expect, it } from 'vitest';
import { blockAppearanceClasses } from '@/lib/page-builder';

describe('blockAppearanceClasses', () => {
  it('should use surface-raised token when background is light', () => {
    expect(blockAppearanceClasses({ background: 'light' }).section).toContain('bg-surface-raised');
  });

  it('should invert ink/surface when background is dark', () => {
    const { section } = blockAppearanceClasses({ background: 'dark' });
    expect(section).toContain('bg-ink');
    expect(section).toContain('text-surface');
  });

  it('should inherit (no bg class) when background is theme', () => {
    const { section } = blockAppearanceClasses({ background: 'theme' });
    expect(section).not.toContain('bg-');
  });

  it('should emit blk-custom-bg class and CSS vars when custom', () => {
    const r = blockAppearanceClasses({ background: 'custom', backgroundCustom: '#abcdef' });
    expect(r.section).toContain('blk-custom-bg');
    expect(r.style['--blk-bg']).toBe('#abcdef');
    expect(r.style['--blk-bg-dark']).toBe('#abcdef'); // dark falls back to light
    expect(r.style.backgroundColor).toBeUndefined();
  });

  it('should use the dark custom color for the dark var when provided', () => {
    const r = blockAppearanceClasses({
      background: 'custom',
      backgroundCustom: '#ffffff',
      backgroundCustomDark: '#14181d',
    });
    expect(r.style['--blk-bg']).toBe('#ffffff');
    expect(r.style['--blk-bg-dark']).toBe('#14181d');
  });

  it('should not emit blk-custom-bg or color vars for non-custom backgrounds', () => {
    const r = blockAppearanceClasses({ background: 'theme' });
    expect(r.section).not.toContain('blk-custom-bg');
    expect(r.style['--blk-bg']).toBeUndefined();
  });

  it('should keep padding and width mapping intact', () => {
    const r = blockAppearanceClasses({ paddingY: 'spacious', containerWidth: 'narrow' });
    expect(r.section).toContain('py-24');
    expect(r.container).toContain('max-w-3xl');
  });
});
