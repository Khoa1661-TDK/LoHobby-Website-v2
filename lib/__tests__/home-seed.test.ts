// lib/__tests__/home-seed.test.ts — covers the Lô Hobby home-page seed layout.
import { describe, expect, it } from 'vitest';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';
import type { PageBlock } from '@/lib/page-builder';

const find = (layout: PageBlock[], type: string): Record<string, unknown> | undefined =>
  layout.find((b) => b.blockType === type) as Record<string, unknown> | undefined;

describe('buildHomeSeedLayout', () => {
  it('should start with a hero block carrying eyebrow, stats and dual CTAs', () => {
    const hero = buildHomeSeedLayout()[0] as Record<string, unknown> | undefined;
    expect(hero?.blockType).toBe('hero');
    expect(hero?.eyebrow).toBeTruthy();
    expect(hero?.ctaHref).toBe('/search');
    expect(hero?.secondaryCtaHref).toBe('/about');
    expect(Array.isArray(hero?.stats)).toBe(true);
    expect((hero?.stats as unknown[]).length).toBeGreaterThan(0);
  });

  it('should build every block without producing nulls', () => {
    const layout = buildHomeSeedLayout({ featuredProductIds: ['p1', 'p2'] });
    expect(layout.every((b) => b != null && typeof b.blockType === 'string')).toBe(true);
  });

  it('should include the category card grid and the trust feature list', () => {
    const grids = buildHomeSeedLayout().filter((b) => b.blockType === 'featureGrid');
    expect(grids.length).toBe(2);
    const cards = grids.find((b) => (b as Record<string, unknown>).variant === 'cards');
    expect(cards).toBeDefined();
    expect((cards as Record<string, unknown>).columns).toBe('4');
  });

  it('should pass product ids through to the productShowcase block', () => {
    const layout = buildHomeSeedLayout({ featuredProductIds: ['a', 'b', 'c'] });
    const showcase = find(layout, 'productShowcase');
    expect(showcase?.products).toEqual(['a', 'b', 'c']);
    expect(showcase?.showTabs).toBe(true);
    expect(showcase?.showSort).toBe(true);
  });

  it('should include a marquee strip with multiple phrases', () => {
    const marquee = find(buildHomeSeedLayout(), 'marquee');
    expect(marquee).toBeDefined();
    expect(Array.isArray(marquee?.items)).toBe(true);
    expect((marquee?.items as unknown[]).length).toBeGreaterThan(1);
  });

  it('should include a spotlight carousel of deals, each bound to a product with a live future countdown', () => {
    const spotlight = find(
      buildHomeSeedLayout({ featuredProductIds: [42, 43] }),
      'spotlight',
    );
    expect(spotlight).toBeDefined();
    const deals = spotlight?.deals as Array<Record<string, unknown>>;
    expect(Array.isArray(deals)).toBe(true);
    expect(deals.length).toBe(2);
    expect(deals[0]?.product).toBe(42);
    expect(deals[1]?.product).toBe(43);
    // Every deal carries its own future countdown target.
    for (const deal of deals) {
      const target = Date.parse(deal.targetDate as string);
      expect(Number.isFinite(target)).toBe(true);
      expect(target).toBeGreaterThan(Date.now());
    }
  });

  it('should include a testimonials block with rated review entries', () => {
    const reviews = find(buildHomeSeedLayout(), 'testimonials');
    expect(reviews).toBeDefined();
    const entries = reviews?.entries as Array<Record<string, unknown>>;
    expect(entries.length).toBeGreaterThan(1);
    expect(entries.every((e) => typeof e.rating === 'number')).toBe(true);
  });

  it('should end with the newsletter block', () => {
    const layout = buildHomeSeedLayout();
    expect(layout[layout.length - 1]?.blockType).toBe('newsletter');
  });
});
