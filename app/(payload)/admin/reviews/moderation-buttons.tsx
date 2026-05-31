'use client';

import { useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { approveReview, deleteReview } from './actions';

type Props = {
  reviewId: string;
  productHandle: string;
  approved: boolean;
};

export default function ModerationButtons({
  reviewId,
  productHandle,
  approved,
}: Props): ReactElement {
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) => {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) {
        toast.error(result.message ?? 'Thao tác thất bại.');
        return;
      }
      toast.success(success);
    });
  };

  return (
    <div className="flex gap-2">
      {!approved ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => approveReview(reviewId, productHandle), 'Đã duyệt đánh giá.')}
          className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          Duyệt
        </button>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => deleteReview(reviewId, productHandle), 'Đã xóa đánh giá.')}
        className="rounded-md border border-rose-300 px-3 py-1 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
      >
        Xóa
      </button>
    </div>
  );
}
