// app/(payload)/admin/gift-cards/gift-card-actions.tsx
'use client';

import { useTransition, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { deleteGiftCardAction, toggleGiftCardAction } from './actions';

type Props = {
  giftCardId: string;
  enabled: boolean;
  usedAmount: number;
};

export default function GiftCardRowActions({ giftCardId, enabled, usedAmount }: Props): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleToggle(): void {
    startTransition(async () => {
      const result = await toggleGiftCardAction(giftCardId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(enabled ? 'Đã vô hiệu hóa thẻ.' : 'Đã kích hoạt thẻ.');
      router.refresh();
    });
  }

  function handleDelete(): void {
    if (!window.confirm('Xóa thẻ quà tặng này?')) return;
    startTransition(async () => {
      const result = await deleteGiftCardAction(giftCardId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Đã xóa thẻ quà tặng.');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={handleToggle}
        className="rounded-md border px-2 py-1 text-xs font-medium disabled:opacity-60"
      >
        {enabled ? 'Tắt' : 'Bật'}
      </button>
      {usedAmount === 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 disabled:opacity-60"
        >
          Xóa
        </button>
      ) : null}
    </div>
  );
}
