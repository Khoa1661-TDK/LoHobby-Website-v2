// lib/categories.ts
export type StoreCategory = {
  slug: string;
  title: string;
  subtitle: string;
  bannerSeed?: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  'moc-khoa': '🔑',
  'mo-hinh': '✈️',
  figure: '🎭',
  'do-choi': '🎲',
  'phu-kien': '🎧',
  'qua-tang': '🎁',
};

export function getCategoryIcon(slug: string): string {
  return CATEGORY_ICONS[slug] ?? '🏷️';
}

import type { Product } from '@/lib/shopify/types';

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

export type ProductBadge = 'new' | 'sold-out';

export function getProductBadge(tags: string[]): ProductBadge | null {
  if (tags.includes('sold-out')) return 'sold-out';
  if (tags.includes('new')) return 'new';
  return null;
}

export const BADGE_LABELS: Record<ProductBadge, string> = {
  new: 'Mới',
  'sold-out': 'Hết hàng',
};

export const BADGE_STYLES: Record<ProductBadge, string> = {
  new: 'bg-orange-500 text-white',
  'sold-out': 'bg-neutral-500 text-white',
};
