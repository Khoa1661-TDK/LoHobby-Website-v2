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
  /** Required when the PDP has variant buttons; pass the selected SKU. */
  variantSku?: string | null;
  /** When false, button stays disabled (e.g. selected variant is OOS). */
  canAdd?: boolean;
};

export default function AddToCart({
  product,
  variantSku = null,
  canAdd = true,
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
          const result = await addItemAction(product.id, variantSku);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success(`Đã thêm ${product.title} vào giỏ hàng`);
          router.refresh();
        })
      }
      className="relative flex w-full items-center justify-center rounded-full bg-filament-500 p-4 font-medium tracking-wide text-white shadow-sm hover:bg-filament-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-filament-500"
    >
      <div className="absolute left-0 ml-4">
        {isPending ? <LoadingDots className="bg-white" /> : <PlusIcon className="h-5" />}
      </div>
      {label}
    </button>
  );
}
