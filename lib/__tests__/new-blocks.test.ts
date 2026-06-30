// lib/__tests__/new-blocks.test.ts — schema round-trip + showcase logic for the
// Lô Hobby blocks added in phase 3.
import { describe, expect, it } from 'vitest';
import { getBlockSchemas } from '@/lib/page-builder/block-schemas';
import { createDefaultBlock } from '@/lib/page-builder/default-block';
import {
  buildShowcaseTabs,
  filterAndSortShowcase,
  humanizeSlug,
} from '@/lib/page-builder/product-showcase';
import type { Product } from '@/lib/shopify/types';

const fieldNames = (slug: string): string[] => {
  const schema = getBlockSchemas().find((s) => s.slug === slug);
  return (schema?.fields ?? []).map((f) => f.name);
};

describe('productShowcase + reels schema registration', () => {
  it('should register both new blocks', () => {
    const slugs = getBlockSchemas().map((s) => s.slug);
    expect(slugs).toEqual(expect.arrayContaining(['productShowcase', 'reels']));
  });

  it('should expose the productShowcase fields', () => {
    expect(fieldNames('productShowcase')).toEqual(
      expect.arrayContaining(['eyebrow', 'heading', 'subheading', 'products', 'showTabs', 'showSort']),
    );
  });

  it('should expose the reels fields including a tile array', () => {
    expect(fieldNames('reels')).toEqual(
      expect.arrayContaining(['eyebrow', 'heading', 'followLabel', 'followHref', 'tiles']),
    );
    const reels = getBlockSchemas().find((s) => s.slug === 'reels');
    const tiles = reels?.fields.find((f) => f.name === 'tiles');
    expect(tiles?.type).toBe('array');
    expect((tiles?.fields ?? []).map((f) => f.name)).toEqual(
      expect.arrayContaining(['poster', 'tag', 'caption', 'views', 'embedUrl']),
    );
  });

  it('should instantiate default blocks from the schema without throwing', () => {
    const showcase = createDefaultBlock('productShowcase');
    const reels = createDefaultBlock('reels');
    expect(showcase?.blockType).toBe('productShowcase');
    expect(reels?.blockType).toBe('reels');
  });
});

const product = (id: string, amount: string, categorySlugs: string[]): Product =>
  ({
    id,
    handle: id,
    title: id,
    categorySlugs,
    priceRange: {
      minVariantPrice: { amount, currencyCode: 'VND' },
      maxVariantPrice: { amount, currencyCode: 'VND' },
    },
  }) as unknown as Product;

describe('product-showcase logic', () => {
  const products = [
    product('a', '300', ['figure']),
    product('b', '100', ['mo-hinh']),
    product('c', '200', ['figure', 'moc-khoa']),
  ];

  it('should humanize a slug into a readable label', () => {
    expect(humanizeSlug('model-kits')).toBe('Model Kits');
  });

  it('should build an "all" tab plus one tab per first-seen category', () => {
    const tabs = buildShowcaseTabs(products, 'All');
    expect(tabs[0]).toMatchObject({ slug: 'all', count: 3 });
    expect(tabs.map((t) => t.slug)).toEqual(['all', 'figure', 'mo-hinh', 'moc-khoa']);
  });

  it('should filter to members of the active category', () => {
    const filtered = filterAndSortShowcase(products, 'figure', 'featured');
    expect(filtered.map((p) => p.id)).toEqual(['a', 'c']);
  });

  it('should sort by price ascending and descending without mutating input', () => {
    const asc = filterAndSortShowcase(products, 'all', 'price-asc');
    expect(asc.map((p) => p.id)).toEqual(['b', 'c', 'a']);
    const desc = filterAndSortShowcase(products, 'all', 'price-desc');
    expect(desc.map((p) => p.id)).toEqual(['a', 'c', 'b']);
    // original order preserved
    expect(products.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('should keep selection order when sorting by featured', () => {
    const featured = filterAndSortShowcase(products, 'all', 'featured');
    expect(featured.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
});
