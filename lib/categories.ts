// lib/categories.ts
import type { Product } from '@/lib/shopify/types';

export type StoreCategory = {
  slug: string;
  title: string;
  subtitle: string;
  bannerSeed?: string;
};

export function groupProductsByCategory(
  products: Product[],
  categories: StoreCategory[],
): Map<string, Product[]> {
  const bySlug = new Map<string, Product[]>(
    categories.map((category) => [category.slug, []]),
  );

  for (const product of products) {
    for (const slug of product.categorySlugs) {
      bySlug.get(slug)?.push(product);
    }
  }

  for (const list of bySlug.values()) {
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  return bySlug;
}

export function toStoreCategory(collection: {
  handle: string;
  title: string;
  description: string;
}): StoreCategory {
  return {
    slug: collection.handle,
    title: collection.title,
    subtitle: collection.description,
  };
}

/**
 * Discount percentage (1–99) for a product when it is on sale, derived from the
 * gap between its original `compareAtPrice` and the current sale price. Returns
 * `null` when the product is not discounted. Used for the "-X%" sale badge.
 */
export function getDiscountPercent(product: Product): number | null {
  const compareAt = product.priceRange.minVariantPrice.compareAtAmount;
  if (!compareAt) return null;
  const original = Number(compareAt);
  const current = Number(product.priceRange.minVariantPrice.amount);
  if (!Number.isFinite(original) || !Number.isFinite(current)) return null;
  if (original <= 0 || current >= original) return null;
  return Math.round(((original - current) / original) * 100);
}

export type ProductBadge = 'new' | 'sold-out';

export function getProductBadge(tags: string[]): ProductBadge | null {
  if (tags.includes('sold-out')) return 'sold-out';
  if (tags.includes('new')) return 'new';
  return null;
}

export const BADGE_STYLES: Record<ProductBadge, string> = {
  new: 'bg-orange-500 text-white',
  'sold-out': 'bg-neutral-500 text-white',
};
