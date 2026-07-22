// components/cart/cart-page-client.tsx — interactive half of the /cart page.
'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useTransition, type ReactElement } from 'react';
import { Link } from '@/i18n/navigation';
import CartCrossSell from '@/components/cart/cross-sell';
import CartLineItem from '@/components/cart/line-item';
import CartSummary from '@/components/cart/summary';
import FreeShippingProgress from '@/components/cart/free-shipping-progress';
import { removeItemAction, updateItemAction } from '@/components/cart/actions';
import type { Cart } from '@/lib/cart';

type Props = { cart: Cart; freeShippingThresholdVnd: number };

export default function CartPageClient({
  cart,
  freeShippingThresholdVnd,
}: Props): ReactElement {
  const t = useTranslations('cart');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const refresh = (): void => {
    router.refresh();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <ul className="rounded-2xl border border-warm-200/60 bg-surface-raised px-4 dark:border-warm-800/40">
          {cart.lines
            .sort((a, b) => a.product.title.localeCompare(b.product.title))
            .map((item) => (
              <CartLineItem
                key={item.id}
                item={item}
                disabled={isPending}
                onRemove={() =>
                  startTransition(async () => {
                    await removeItemAction(item.merchandiseId, item.variantSku);
                    refresh();
                  })
                }
                onQuantityChange={(quantity) =>
                  startTransition(async () => {
                    await updateItemAction(item.merchandiseId, quantity, item.variantSku);
                    refresh();
                  })
                }
              />
            ))}
        </ul>

        <div className="mt-8">
          <CartCrossSell excludeHandles={cart.lines.map((line) => line.handle)} />
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-warm-200/60 bg-surface-raised p-5 lg:sticky lg:top-24 dark:border-warm-800/40">
        <FreeShippingProgress
          subtotalVnd={Number(cart.cost.subtotalAmount.amount)}
          currencyCode={cart.cost.subtotalAmount.currencyCode}
          thresholdVnd={freeShippingThresholdVnd}
        />

        <CartSummary cart={cart} showSubtotal />

        <Link
          href="/checkout"
          className="mt-5 block w-full rounded-full bg-warm-900 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
        >
          {t('checkout')}
        </Link>
        <Link
          href="/search"
          className="mt-3 block w-full text-center text-sm font-medium text-warm-600 underline-offset-4 hover:underline dark:text-warm-400"
        >
          {t('continueShopping')}
        </Link>
      </aside>
    </div>
  );
}
