// components/cart/add-to-cart.tsx
'use client';

import { PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition, type ReactElement } from 'react';
import { toast } from 'sonner';
import { addItemAction } from '@/components/cart/actions';
import LoadingDots from '@/components/loading-dots';
import { useCartFlyIn } from '@/lib/animations/hooks/useCartFlyIn';
import { useRipple } from '@/lib/animations/hooks/useRipple';
import { beacon, getAnonId, getSession } from '@/lib/analytics/track-client';
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
  const t = useTranslations('cart');
  const { flyToCart } = useCartFlyIn();
  const { ref: rippleRef, onPointerDown } = useRipple<HTMLButtonElement>();
  const available = product.availableForSale && canAdd;
  const label = !available
    ? t('outOfStock')
    : isPending
      ? t('adding')
      : t('addToCart');

  return (
    <button
      ref={rippleRef}
      aria-label={t('addToCartAria')}
      disabled={!available || isPending}
      onPointerDown={onPointerDown}
      onClick={(event) =>
        startTransition(async () => {
          const trigger = event.currentTarget;
          const result = await addItemAction(product.id, variantSku, quantity);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          flyToCart(trigger);
          toast.success(
            quantity > 1
              ? t('addedQtyToast', { quantity, title: product.title })
              : t('addedToast', { title: product.title }),
          );
          beacon('/api/track/cart', {
            anonId: getAnonId(),
            sessionId: getSession().id,
            productId: product.id,
            productHandle: product.handle,
            quantity,
          });
          router.refresh();
        })
      }
      className="relative flex w-full items-center justify-center overflow-hidden rounded-full bg-warm-900 py-3.5 font-semibold uppercase tracking-wide text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-warm-900 dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
    >
      <div className="absolute left-0 ml-4">
        {isPending ? <LoadingDots className="bg-warm-50 dark:bg-warm-900" /> : <PlusIcon className="h-5" />}
      </div>
      {label}
    </button>
  );
}