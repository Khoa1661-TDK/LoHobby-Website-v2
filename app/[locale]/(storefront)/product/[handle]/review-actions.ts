'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { hasPurchasedProduct } from '@/lib/reviews';
import { logger } from '@/lib/logger';

export type ReviewActionResult = { ok: true } | { ok: false; error: string };

const MAX_TITLE = 120;
const MAX_BODY = 2000;

export async function submitReviewAction(formData: FormData): Promise<ReviewActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: 'Bạn cần đăng nhập để viết đánh giá.' };
  }

  const productId = String(formData.get('productId') ?? '').trim();
  const productHandle = String(formData.get('productHandle') ?? '').trim();
  const rating = Number(formData.get('rating'));
  const title = String(formData.get('title') ?? '').trim().slice(0, MAX_TITLE);
  const body = String(formData.get('body') ?? '').trim().slice(0, MAX_BODY);

  if (!productId) return { ok: false, error: 'Sản phẩm không hợp lệ.' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: 'Vui lòng chọn số sao từ 1 đến 5.' };
  }
  if (body.length < 10) {
    return { ok: false, error: 'Nội dung đánh giá cần ít nhất 10 ký tự.' };
  }

  const purchased = await hasPurchasedProduct(session.user.id, productId);
  if (!purchased) {
    return { ok: false, error: 'Chỉ khách đã mua sản phẩm mới có thể đánh giá.' };
  }

  try {
    await prisma.review.upsert({
      where: { userId_productId: { userId: session.user.id, productId } },
      create: {
        userId: session.user.id,
        productId,
        productHandle,
        rating,
        title: title || null,
        body,
        approved: false,
      },
      update: {
        rating,
        title: title || null,
        body,
        // Editing a review re-queues it for moderation.
        approved: false,
      },
    });
  } catch (error) {
    logger.error({ err: error }, '[reviews.submitReviewAction] failed');
    return { ok: false, error: 'Không thể gửi đánh giá. Vui lòng thử lại.' };
  }

  if (productHandle) {
    revalidatePath(`/product/${productHandle}`);
  }
  return { ok: true };
}
