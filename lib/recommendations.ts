// lib/recommendations.ts — purchase-history based product recommendations
import { prisma } from '@/lib/prisma';
import { getProducts } from '@/lib/shopify';
import type { Product } from '@/lib/shopify/types';

/**
 * Recommend available products from the categories a user has bought from,
 * excluding items they already purchased. Computed in memory against the full
 * catalog, which is small enough to load fully (same approach as browse
 * filtering/pagination elsewhere).
 */
export async function getPersonalizedRecommendations(
  userId: string,
  limit = 8,
): Promise<Product[]> {
  const { listPurchasedProductIdsForUser } = await import('@/lib/payload-orders');
  const purchased = await listPurchasedProductIdsForUser({ prismaUserId: userId });
  if (purchased.length === 0) return [];

  const purchasedIds = new Set(purchased);
  const products = await getProducts({ sortKey: 'BEST_SELLING' });

  const purchasedCategories = new Set<string>();
  for (const product of products) {
    if (purchasedIds.has(product.id)) {
      for (const slug of product.categorySlugs) purchasedCategories.add(slug);
    }
  }

  if (purchasedCategories.size === 0) return [];

  return products
    .filter(
      (product) =>
        product.availableForSale &&
        !purchasedIds.has(product.id) &&
        product.categorySlugs.some((slug) => purchasedCategories.has(slug)),
    )
    .slice(0, limit);
}
