// lib/__tests__/product-badge.test.ts
import { describe, expect, it } from 'vitest';
import { getProductBadge, BADGE_STYLES } from '@/lib/categories';

describe('product badge styling', () => {
  it('should return a badge for the new and sold-out tags', () => {
    expect(getProductBadge(['new'])).toBe('new');
    expect(getProductBadge(['sold-out'])).toBe('sold-out');
    expect(getProductBadge(['whatever'])).toBeNull();
  });

  it('should have a style entry for every badge getProductBadge can return', () => {
    for (const tag of ['new', 'sold-out'] as const) {
      const badge = getProductBadge([tag]);
      expect(badge).not.toBeNull();
      expect(BADGE_STYLES[badge!]).toBeTruthy();
    }
  });
});
