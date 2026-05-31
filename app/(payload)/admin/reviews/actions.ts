'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export type ReviewModerationResult = { ok: true } | { ok: false; message: string };

async function revalidateAfter(productHandle: string): Promise<void> {
  revalidatePath('/admin/reviews');
  if (productHandle) {
    revalidatePath(`/product/${productHandle}`);
  }
}

export async function approveReview(
  reviewId: string,
  productHandle: string,
): Promise<ReviewModerationResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Bạn không có quyền duyệt đánh giá.' };
  }
  if (!reviewId) return { ok: false, message: 'Thiếu mã đánh giá.' };

  await prisma.review.update({ where: { id: reviewId }, data: { approved: true } });
  await revalidateAfter(productHandle);
  return { ok: true };
}

export async function deleteReview(
  reviewId: string,
  productHandle: string,
): Promise<ReviewModerationResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Bạn không có quyền xóa đánh giá.' };
  }
  if (!reviewId) return { ok: false, message: 'Thiếu mã đánh giá.' };

  await prisma.review.delete({ where: { id: reviewId } });
  await revalidateAfter(productHandle);
  return { ok: true };
}
