import { describe, expect, it } from 'vitest';
import { blockAppearanceClasses } from '@/lib/page-builder';

describe('blockAppearanceClasses customization', () => {
  it('should add text-center when contentAlign is center', () => {
    expect(blockAppearanceClasses({ contentAlign: 'center' }).container).toContain('text-center');
  });

  it('should add rounded, overflow-hidden and border classes to the section', () => {
    const { section } = blockAppearanceClasses({ rounded: 'lg', border: true });
    expect(section).toContain('rounded-lg');
    expect(section).toContain('overflow-hidden');
    expect(section).toContain('border border-line');
  });

  it('should set --blk-maxw and the blk-maxw class for a custom width', () => {
    const { container, style } = blockAppearanceClasses({
      containerWidth: 'custom',
      maxWidthCustom: '720px',
    });
    expect(container).toContain('blk-maxw');
    expect(style['--blk-maxw']).toBe('720px');
  });

  it('should ignore an invalid custom max-width', () => {
    const { style } = blockAppearanceClasses({ containerWidth: 'custom', maxWidthCustom: 'abc' });
    expect(style['--blk-maxw']).toBeUndefined();
  });
});
