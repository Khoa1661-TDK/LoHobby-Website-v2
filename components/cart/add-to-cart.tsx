// components/cart/add-to-cart.tsx
'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { addItemAction } from '@/components/cart/actions';
import LoadingDots from '@/components/loading-dots';
import type { Product } from '@/lib/shopify/types';

type Props = {
  product: Product;
  variantSku?: string | null;
  canAdd?: boolean;
  quantity?: number;
};

export default function AddToCart({
  product,
  variantSku = null,
  canAdd = true,
  quantity = 1,
}: Props): ReactElement {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const available = product.availableForSale && canAdd;
  const label = !available
    ? 'Hết hàng'
    : isPending
      ? 'Đang thêm…'
      : 'Thêm vào giỏ';

  return (
    <button
      aria-label="Thêm vào giỏ hàng"
      disabled={!available || isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await addItemAction(product.id, variantSku, quantity);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success(
            quantity > 1
              ? `Đã thêm ${quantity} ${product.title} vào giỏ hàng`
              : `Đã thêm ${product.title} vào giỏ hàng`,
          );
          router.refresh();
        })
      }
      className="relative flex w-full items-center justify-center rounded-xl bg-warm-900 py-3.5 font-semibold tracking-wide text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-warm-900 dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
    >
      <div className="absolute left-0 ml-4">
        {isPending ? <LoadingDots className="bg-warm-50 dark:bg-warm-900" /> : <PlusIcon className="h-5" />}
      </div>
      {label}
    </button>
  );
}