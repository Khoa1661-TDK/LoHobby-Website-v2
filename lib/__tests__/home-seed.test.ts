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

  it('should include a reels block with multiple tiles', () => {
    const reels = find(buildHomeSeedLayout(), 'reels');
    expect(reels).toBeDefined();
    expect(Array.isArray(reels?.tiles)).toBe(true);
    expect((reels?.tiles as unknown[]).length).toBeGreaterThan(1);
  });

  it('should end with the newsletter block', () => {
    const layout = buildHomeSeedLayout();
    expect(layout[layout.length - 1]?.blockType).toBe('newsletter');
  });
});
