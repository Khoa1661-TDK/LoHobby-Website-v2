import Link from 'next/link';
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import ReviewForm from '@/components/product/review-form';
import Stars from '@/components/product/stars';
import {
  getApprovedReviews,
  getOwnReview,
  getReviewSummary,
  hasPurchasedProduct,
} from '@/lib/reviews';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('vi-VN', { dateStyle: 'medium' });
}

export default async function ProductReviews({
  productId,
  productHandle,
}: {
  productId: string;
  productHandle: string;
}): Promise<ReactElement> {
  const session = await auth();
  const userId = session?.user?.id;

  const [summary, reviews, ownReview, purchased] = await Promise.all([
    getReviewSummary(productId),
    getApprovedReviews(productId),
    userId ? getOwnReview(userId, productId) : Promise.resolve(null),
    userId ? hasPurchasedProduct(userId, productId) : Promise.resolve(false),
  ]);

  return (
    <section className="py-8" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-heading" className="text-2xl font-bold">
          Đánh giá
        </h2>
        {summary.count > 0 ? (
          <div className="flex items-center gap-2">
            <Stars rating={summary.average} size="md" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {summary.average} / 5 · {summary.count} đánh giá
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {reviews.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ cảm nhận!
            </p>
          ) : (
            <ul className="space-y-5">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="border-b border-neutral-200 pb-5 last:border-none dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                      {review.author}
                    </span>
                    <span className="text-xs text-neutral-400">{formatDate(review.createdAt)}</span>
                  </div>
                  <Stars rating={review.rating} className="mt-1" />
                  {review.title ? (
                    <p className="mt-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {review.title}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {review.body}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          {!userId ? (
            <div className="rounded-2xl border border-neutral-200 p-5 text-sm dark:border-neutral-800">
              <p className="text-neutral-600 dark:text-neutral-400">
                <Link
                  href={`/login?callbackUrl=/product/${productHandle}`}
                  className="font-medium underline"
                >
                  Đăng nhập
                </Link>{' '}
                để viết đánh giá cho sản phẩm bạn đã mua.
              </p>
            </div>
          ) : purchased || ownReview ? (
            <ReviewForm
              productId={productId}
              productHandle={productHandle}
              ownReview={ownReview}
            />
          ) : (
            <div className="rounded-2xl border border-neutral-200 p-5 text-sm dark:border-neutral-800">
              <p className="text-neutral-600 dark:text-neutral-400">
                Chỉ khách hàng đã mua sản phẩm này mới có thể viết đánh giá.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
