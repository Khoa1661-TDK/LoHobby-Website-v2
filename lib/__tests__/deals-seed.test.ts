// lib/__tests__/deals-seed.test.ts — covers the promotions/sale page seed layout.
import { describe, expect, it } from 'vitest';
import { buildDealsSeedLayout } from '@/lib/page-builder/deals-seed';

describe('buildDealsSeedLayout', () => {
  it('should start with a hero pointing at the on-sale listing', () => {
    const layout = buildDealsSeedLayout();
    expect(layout[0]?.blockType).toBe('hero');
    const hero = layout[0] as Record<string, unknown>;
    expect(hero.ctaHref).toBe('/search/on-sale');
  });

  it('should include a promo banner with a countdown', () => {
    const promo = buildDealsSeedLayout().find((b) => b.blockType === 'promoBanner') as
      | Record<string, unknown>
      | undefined;
    expect(promo).toBeDefined();
    expect(typeof promo?.countdown).toBe('string');
  });

  it('should bind the featured collection to the on-sale category when an id is given', () => {
    const fc = buildDealsSeedLayout({ onSaleCategoryId: 42 }).find(
      (b) => b.blockType === 'featuredCollection',
    ) as Record<string, unknown> | undefined;
    expect(fc?.collection).toBe(42);
  });

  it('should leave the featured collection unbound when no category id is given', () => {
    const fc = buildDealsSeedLayout().find((b) => b.blockType === 'featuredCollection') as
      | Record<string, unknown>
      | undefined;
    expect(fc).toBeDefined();
    // Default-block collection value for a single relationship is null.
    expect(fc?.collection ?? null).toBeNull();
  });

  it('should end with a call to action', () => {
    const layout = buildDealsSeedLayout();
    expect(layout[layout.length - 1]?.blockType).toBe('callToAction');
  });
});
