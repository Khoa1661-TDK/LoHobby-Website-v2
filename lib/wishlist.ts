// lib/wishlist.ts — saved products (Prisma-backed, per user)
import { prisma } from '@/lib/prisma';

/** Set of product IDs the user has saved, for quick membership checks. */
export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });
  return rows.map((row) => row.productId);
}

/** Wishlist rows ordered newest first, with the stored product handle. */
export async function getWishlistItems(
  userId: string,
): Promise<{ productId: string; productHandle: string; createdAt: string }[]> {
  const rows = await prisma.wishlistItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { productId: true, productHandle: true, createdAt: true },
  });
  return rows.map((row) => ({
    productId: row.productId,
    productHandle: row.productHandle,
    createdAt: row.createdAt.toISOString(),
  }));
}
