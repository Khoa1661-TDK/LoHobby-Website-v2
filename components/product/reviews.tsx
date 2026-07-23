import { Link } from '@/i18n/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import ReviewForm from '@/components/product/review-form';
import Stars from '@/components/product/stars';
import { formatReviewDate } from '@/lib/review-date';
import {
  getApprovedReviews,
  getOwnReview,
  getReviewSummary,
  hasPurchasedProduct,
} from '@/lib/reviews';

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

  const t = await getTranslations('product');
  const locale = await getLocale();

  return (
    <section className="py-8" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-heading" className="text-2xl font-bold">
          {t('reviewsHeading')}
        </h2>
        {summary.count > 0 ? (
          <div className="flex items-center gap-2">
            <Stars rating={summary.average} size="md" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {t('reviewsCount', { count: summary.count })}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          {reviews.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('reviewsEmpty')}
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
                    <span className="text-xs text-neutral-400">
                      {formatReviewDate(review.createdAt, locale)}
                    </span>
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
                  {t('reviewsLogin')}
                </Link>{' '}
                {t('reviewsLoginSuffix')}
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
                {t('reviewsPurchasedOnly')}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
