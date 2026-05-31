// app/(payload)/admin/coupons/coupon-actions.tsx
'use client';

import { useTransition, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteCouponAction, toggleCouponAction } from './actions';

type Props = {
  couponId: string;
  enabled: boolean;
  usedCount: number;
};

export default function CouponRowActions({ couponId, enabled, usedCount }: Props): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onToggle = (): void => {
    startTransition(async () => {
      const result = await toggleCouponAction(couponId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(enabled ? 'Đã tắt mã.' : 'Đã bật mã.');
      router.refresh();
    });
  };

  const onDelete = (): void => {
    if (!window.confirm('Xóa mã giảm giá này?')) return;
    startTransition(async () => {
      const result = await deleteCouponAction(couponId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Đã xóa mã.');
      router.refresh();
    });
  };

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className="rounded-md border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60"
      >
        {enabled ? 'Tắt' : 'Bật'}
      </button>
      {usedCount === 0 ? (
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="rounded-md border border-rose-200 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-60"
        >
          Xóa
        </button>
      ) : null}
    </div>
  );
}
