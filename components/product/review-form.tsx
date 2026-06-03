'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { submitReviewAction } from '@/app/[locale]/(storefront)/product/[handle]/review-actions';
import type { OwnReview } from '@/lib/reviews';

type Props = {
  productId: string;
  productHandle: string;
  ownReview: OwnReview | null;
};

export default function ReviewForm({
  productId,
  productHandle,
  ownReview,
}: Props): ReactElement {
  const router = useRouter();
  const [rating, setRating] = useState(ownReview?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('rating', String(rating));
    formData.set('productId', productId);
    formData.set('productHandle', productHandle);

    startTransition(async () => {
      const result = await submitReviewAction(formData);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Cảm ơn bạn! Đánh giá sẽ hiển thị sau khi được duyệt.');
      router.refresh();
    });
  };

  const active = hover || rating;

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-neutral-200 p-5 dark:border-neutral-800"
    >
      <h3 className="text-base font-semibold">
        {ownReview ? 'Cập nhật đánh giá của bạn' : 'Viết đánh giá'}
      </h3>
      {ownReview && !ownReview.approved ? (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
          Đánh giá hiện tại của bạn đang chờ duyệt.
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} sao`}
            aria-pressed={rating === value}
            onMouseEnter={() => setHover(value)}
            onClick={() => setRating(value)}
            className="p-0.5"
          >
            <svg
              viewBox="0 0 20 20"
              aria-hidden
              className={`h-7 w-7 transition ${
                value <= active ? 'text-amber-400' : 'text-neutral-300 dark:text-neutral-600'
              }`}
              fill="currentColor"
            >
              <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 14.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L10 1.5z" />
            </svg>
          </button>
        ))}
      </div>

      <input
        type="text"
        name="title"
        defaultValue={ownReview?.title ?? ''}
        maxLength={120}
        placeholder="Tiêu đề (tùy chọn)"
        className="mt-4 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />
      <textarea
        name="body"
        defaultValue={ownReview?.body ?? ''}
        required
        rows={4}
        maxLength={2000}
        placeholder="Chia sẻ cảm nhận của bạn về sản phẩm…"
        className="mt-3 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
      />

      <button
        type="submit"
        disabled={isPending || rating === 0}
        className="mt-4 inline-flex rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
      >
        {isPending ? 'Đang gửi…' : ownReview ? 'Cập nhật' : 'Gửi đánh giá'}
      </button>
    </form>
  );
}
