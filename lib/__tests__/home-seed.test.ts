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

  it('should bind featured collections to category ids when provided', () => {
    const layout = buildHomeSeedLayout({ categoryIdBySlug: { 'mo-hinh': 3, 'moc-khoa': 5 } });
    const bound = layout
      .filter((b) => b.blockType === 'featuredCollection')
      .map((b) => (b as Record<string, unknown>).collection);
    expect(bound).toContain(3);
    expect(bound).toContain(5);
  });

  it('should leave featured collections unbound when no category ids are given', () => {
    const fc = buildHomeSeedLayout().find((b) => b.blockType === 'featuredCollection') as
      | Record<string, unknown>
      | undefined;
    expect(fc?.collection ?? null).toBeNull();
  });

  it('should include testimonials, quote, and call-to-action blocks', () => {
    const types = buildHomeSeedLayout().map((b) => b.blockType);
    expect(types).toContain('testimonials');
    expect(types).toContain('quote');
    expect(types).toContain('callToAction');
  });

  it('should give every testimonial entry a quote and author', () => {
    const block = buildHomeSeedLayout().find((b) => b.blockType === 'testimonials') as
      | { entries?: Array<{ quote?: string; author?: string }> }
      | undefined;
    expect(block?.entries?.length).toBeGreaterThan(0);
    for (const entry of block?.entries ?? []) {
      expect(entry.quote).toBeTruthy();
      expect(entry.author).toBeTruthy();
    }
  });

  it('should give the quote block a non-empty quote (schema requires it)', () => {
    const quote = buildHomeSeedLayout().find((b) => b.blockType === 'quote') as
      | { quote?: string }
      | undefined;
    expect(quote?.quote).toBeTruthy();
  });

  it('should author FAQ answers as valid lexical state', () => {
    const faq = buildHomeSeedLayout().find((b) => b.blockType === 'faq') as
      | { items?: Array<{ answer?: { root?: { type?: string } } }> }
      | undefined;
    const firstAnswer = faq?.items?.[0]?.answer;
    expect(firstAnswer?.root?.type).toBe('root');
  });
});
