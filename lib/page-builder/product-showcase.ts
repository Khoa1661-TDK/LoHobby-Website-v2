// lib/page-builder/product-showcase.ts — pure filter/sort helpers for the
// ProductShowcase block. Kept framework-free so they can be unit-tested and
// reused by both the server block and its client island.
import type { Product } from '@/lib/shopify/types';

export type ShowcaseSort = 'featured' | 'price-asc' | 'price-desc';

export type ShowcaseTab = { slug: string; label: string; count: number };

/** Turn a category slug into a human label: "model-kits" → "Model Kits". */
export function humanizeSlug(slug: string): string {
  return slug
    .split(/[-_/]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Build the category tab list from the products' categorySlugs, preserving
 *  first-seen order and counting members. An "all" tab is prepended. */
export function buildShowcaseTabs(
  products: Product[],
  allLabel = 'All',
): ShowcaseTab[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const slug of p.categorySlugs ?? []) {
      if (!slug) continue;
      counts.set(slug, (counts.get(slug) ?? 0) + 1);
    }
  }
  const tabs: ShowcaseTab[] = [
    { slug: 'all', label: allLabel, count: products.length },
  ];
  for (const [slug, count] of counts) {
    tabs.push({ slug, label: humanizeSlug(slug), count });
  }
  return tabs;
}

/** Filter by category slug ("all" → no filter) then sort by the chosen order.
 *  Sorting is stable and never mutates the input array. */
export function filterAndSortShowcase(
  products: Product[],
  activeTab: string,
  sort: ShowcaseSort,
): Product[] {
  const filtered =
    !activeTab || activeTab === 'all'
      ? products
      : products.filter((p) => (p.categorySlugs ?? []).includes(activeTab));

  if (sort === 'featured') return filtered;

  const priceOf = (p: Product): number =>
    Number.parseFloat(p.priceRange?.minVariantPrice?.amount ?? '0') || 0;

  return [...filtered].sort((a, b) =>
    sort === 'price-asc' ? priceOf(a) - priceOf(b) : priceOf(b) - priceOf(a),
  );
}
