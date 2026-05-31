'use client';

import { useRouter } from 'next/navigation';
import { useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { reorderAction } from '@/app/(storefront)/profile/actions';

export default function ReorderButton({ orderId }: { orderId: string }): ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await reorderAction(orderId);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success('Đã thêm sản phẩm vào giỏ hàng.');
          router.refresh();
        })
      }
      className="inline-flex rounded-full bg-filament-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-filament-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
    >
      {pending ? 'Đang thêm…' : 'Mua lại'}
    </button>
  );
}
