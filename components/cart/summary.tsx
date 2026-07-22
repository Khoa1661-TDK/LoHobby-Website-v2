// components/cart/summary.tsx — cart totals, shared by the modal and /cart so
// the two cannot report different numbers for the same cart.
'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import Price from '@/components/price';
import type { Cart } from '@/lib/cart';

type Props = {
  cart: Cart;
  /** The modal shows a tax row; the page shows a subtotal row instead. */
  showTax?: boolean;
  showSubtotal?: boolean;
};

const ROW = 'mb-2 flex items-center justify-between border-b border-warm-200/30 pb-2 dark:border-warm-800/20';

export default function CartSummary({
  cart,
  showTax = false,
  showSubtotal = false,
}: Props): ReactElement {
  const t = useTranslations('cart');

  return (
    <div className="py-4 text-sm text-warm-500 dark:text-warm-400">
      {showSubtotal ? (
        <div className={ROW}>
          <span>{t('subtotal')}</span>
          <Price
            className="text-sm font-medium text-warm-900 dark:text-warm-100"
            amount={cart.cost.subtotalAmount.amount}
            currencyCode={cart.cost.subtotalAmount.currencyCode}
          />
        </div>
      ) : null}
      {showTax ? (
        <div className={ROW}>
          <span>{t('tax')}</span>
          <Price
            className="text-sm font-medium text-warm-900 dark:text-warm-100"
            amount="0"
            currencyCode={cart.cost.totalAmount.currencyCode}
          />
        </div>
      ) : null}
      <div className={ROW}>
        <span>{t('shipping')}</span>
        <span>{t('shippingAtCheckout')}</span>
      </div>
      <div className="flex items-center justify-between pt-1">
        <span className="font-semibold text-warm-900 dark:text-warm-100">{t('total')}</span>
        <Price
          className="text-base font-bold text-warm-900 dark:text-warm-100"
          amount={cart.cost.totalAmount.amount}
          currencyCode={cart.cost.totalAmount.currencyCode}
        />
      </div>
    </div>
  );
}
