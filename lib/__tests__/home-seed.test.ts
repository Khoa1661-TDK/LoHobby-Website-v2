// lib/__tests__/home-seed.test.ts — covers the designed home-page seed layout.
import { describe, expect, it } from 'vitest';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';

describe('buildHomeSeedLayout', () => {
  it('should start with a hero block', () => {
    expect(buildHomeSeedLayout()[0]?.blockType).toBe('hero');
  });

  it('should omit featuredProducts when no product ids given', () => {
    const types = buildHomeSeedLayout().map((b) => b.blockType);
    expect(types).not.toContain('featuredProducts');
  });

  it('should include a valid featuredProducts block when ids are given', () => {
    const layout = buildHomeSeedLayout({ featuredProductIds: ['p1', 'p2'] });
    const fp = layout.find((b) => b.blockType === 'featuredProducts') as Record<string, unknown> | undefined;
    expect(fp).toBeDefined();
    expect(fp?.products).toEqual(['p1', 'p2']);
  });

  it('should include the newsletter accent block', () => {
    const types = buildHomeSeedLayout().map((b) => b.blockType);
    expect(types).toContain('newsletter');
  });

  it('should point the promo banner at the sale page', () => {
    const promo = buildHomeSeedLayout().find((b) => b.blockType === 'promoBanner') as
      | Record<string, unknown>
      | undefined;
    expect(promo?.ctaHref).toBe('/pages/sale');
  });

  it('should author FAQ answers as valid lexical state', () => {
    const faq = buildHomeSeedLayout().find((b) => b.blockType === 'faq') as
      | { items?: Array<{ answer?: { root?: { type?: string } } }> }
      | undefined;
    const firstAnswer = faq?.items?.[0]?.answer;
    expect(firstAnswer?.root?.type).toBe('root');
  });
});
