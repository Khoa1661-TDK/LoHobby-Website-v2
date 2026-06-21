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

  it('should set inline backgroundColor and no bg class when custom', () => {
    const r = blockAppearanceClasses({ background: 'custom', backgroundCustom: '#abcdef' });
    expect(r.style.backgroundColor).toBe('#abcdef');
    expect(r.section).not.toContain('bg-warm');
  });

  it('should keep padding and width mapping intact', () => {
    const r = blockAppearanceClasses({ paddingY: 'spacious', containerWidth: 'narrow' });
    expect(r.section).toContain('py-24');
    expect(r.container).toContain('max-w-3xl');
  });
});
