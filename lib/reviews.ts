// lib/reviews.ts — product review queries (Prisma-backed, moderated)
import { prisma } from '@/lib/prisma';

export type ReviewSummary = {
  count: number;
  average: number;
};

export type PublicReview = {
  id: string;
  author: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
};

export type OwnReview = {
  rating: number;
  title: string | null;
  body: string;
  approved: boolean;
};

/** Aggregate rating across approved reviews for a product. */
export async function getReviewSummary(productId: string): Promise<ReviewSummary> {
  const result = await prisma.review.aggregate({
    where: { productId, approved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });
  return {
    count: result._count._all,
    average: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : 0,
  };
}

/** Approved reviews for public display, newest first. */
export async function getApprovedReviews(productId: string): Promise<PublicReview[]> {
  const rows = await prisma.review.findMany({
    where: { productId, approved: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { user: { select: { name: true, email: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    author: row.user.name?.trim() || row.user.email.split('@')[0] || 'Khách hàng',
    rating: row.rating,
    title: row.title,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
  }));
}

/** The signed-in user's own review for a product (any moderation state). */
export async function getOwnReview(
  userId: string,
  productId: string,
): Promise<OwnReview | null> {
  const row = await prisma.review.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { rating: true, title: true, body: true, approved: true },
  });
  return row ?? null;
}

/**
 * Whether the user has an order containing this product. Reviews are limited to
 * verified buyers so the rating reflects real purchases.
 */
export async function hasPurchasedProduct(
  userId: string,
  productId: string,
): Promise<boolean> {
  const { listPurchasedProductIdsForUser } = await import('@/lib/payload-orders');
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const purchased = await listPurchasedProductIdsForUser({
    prismaUserId: userId,
    buyerEmail: user?.email,
  });
  return purchased.includes(productId);
}
