// components/cart/modal.tsx
'use client';

import { Dialog, Transition } from '@headlessui/react';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactElement,
} from 'react';
import CartCrossSell from '@/components/cart/cross-sell';
import FreeShippingProgress from '@/components/cart/free-shipping-progress';
import CartLineItem from '@/components/cart/line-item';
import CartSummary from '@/components/cart/summary';
import { useBumpPulse } from '@/lib/animations/hooks/useBumpPulse';
import {
  removeItemAction,
  updateItemAction,
} from '@/components/cart/actions';
import type { Cart } from '@/lib/cart';

type Props = { cart: Cart; freeShippingThresholdVnd: number };

export default function CartModal({ cart, freeShippingThresholdVnd }: Props): ReactElement {
  const t = useTranslations('cart');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const quantityRef = useRef(cart.totalQuantity);

  const openCart = (): void => setIsOpen(true);
  const closeCart = (): void => setIsOpen(false);

  useEffect(() => {
    if (cart.totalQuantity !== quantityRef.current && cart.totalQuantity > 0) {
      if (!isOpen) {
        setIsOpen(true);
      }
      quantityRef.current = cart.totalQuantity;
    }
  }, [isOpen, cart.totalQuantity]);

  const refresh = (): void => {
    router.refresh();
  };

  return (
    <>
      <span aria-live="polite" className="sr-only">
        {t('srItemCount', { count: cart.totalQuantity })}
      </span>
      <button aria-label={t('openCartAria')} onClick={openCart}>
        <OpenCart quantity={cart.totalQuantity} />
      </button>
      <Transition show={isOpen}>
        <Dialog onClose={closeCart} className="relative z-50">
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="opacity-0 backdrop-blur-none"
            enterTo="opacity-100 backdrop-blur-[.5px]"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="opacity-100 backdrop-blur-[.5px]"
            leaveTo="opacity-0 backdrop-blur-none"
          >
            <div className="fixed inset-0 bg-warm-950/30" aria-hidden="true" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-smooth duration-400"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-all ease-smooth duration-250"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="fixed bottom-0 right-0 top-0 flex h-full w-full flex-col border-l border-warm-200/60 bg-warm-50/90 p-6 text-warm-900 backdrop-blur-2xl dark:border-warm-800/40 dark:bg-warm-950/90 dark:text-warm-100 md:w-[420px]">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{t('title')}</p>
                  {cart.lines.length > 0 && (
                    <p className="text-xs text-warm-500 dark:text-warm-400">
                      {t('itemCount', { count: cart.totalQuantity })}
                    </p>
                  )}
                </div>
                <button aria-label={t('closeCartAria')} onClick={closeCart}>
                  <CloseCart />
                </button>
              </div>

              {cart.lines.length === 0 ? (
                <div className="mt-20 flex w-full flex-col items-center justify-center overflow-hidden">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-warm-100/80 dark:bg-warm-800/50">
                    <ShoppingCartIcon className="h-8 w-8 text-warm-400" />
                  </div>
                  <p className="mt-5 text-xl font-bold">{t('empty')}</p>
                  <p className="mt-1.5 text-center text-sm text-warm-500 dark:text-warm-400">
                    {t('emptyBody')}
                  </p>
                  <Link
                    href="/search"
                    onClick={closeCart}
                    className="mt-6 inline-flex rounded-full bg-warm-900 px-6 py-2.5 text-sm font-semibold uppercase tracking-wide text-warm-50 transition-all duration-200 hover:bg-warm-800 dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
                  >
                    {t('exploreNow')}
                  </Link>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between overflow-hidden p-1">
                  <ul className="flex-grow overflow-auto py-4">
                    {cart.lines
                      .sort((a, b) => a.product.title.localeCompare(b.product.title))
                      .map((item) => (
                        <CartLineItem
                          key={item.id}
                          item={item}
                          disabled={isPending}
                          onNavigate={closeCart}
                          onRemove={() =>
                            startTransition(async () => {
                              await removeItemAction(item.merchandiseId, item.variantSku);
                              refresh();
                            })
                          }
                          onQuantityChange={(quantity) =>
                            startTransition(async () => {
                              await updateItemAction(
                                item.merchandiseId,
                                quantity,
                                item.variantSku,
                              );
                              refresh();
                            })
                          }
                        />
                      ))}
                  </ul>

                  <CartCrossSell
                    excludeHandles={cart.lines.map((line) => line.handle)}
                  />

                  <div className="pt-3">
                    <FreeShippingProgress
                      subtotalVnd={Number(cart.cost.subtotalAmount.amount)}
                      currencyCode={cart.cost.subtotalAmount.currencyCode}
                      thresholdVnd={freeShippingThresholdVnd}
                    />
                  </div>

                  <CartSummary cart={cart} showTax />

                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="block w-full rounded-full bg-warm-900 py-3.5 text-center text-sm font-semibold uppercase tracking-wide text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
                  >
                    {t('checkout')}
                  </Link>
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </Dialog>
      </Transition>
    </>
  );
}

function OpenCart({
  className,
  quantity,
}: {
  className?: string;
  quantity?: number;
}): ReactElement {
  const badgeRef = useBumpPulse<HTMLDivElement>(quantity ?? 0);
  return (
    <div
      data-cart-icon
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-warm-200/80 text-warm-600 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-200"
    >
      <ShoppingCartIcon
        className={`h-4 w-4 transition-all ease-spring hover:scale-110 ${className ?? ''}`}
      />
      {quantity ? (
        <div
          ref={badgeRef}
          className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-warm-900 px-1 text-[10px] font-bold text-warm-50 shadow-sm dark:bg-warm-100 dark:text-warm-900"
        >
          {quantity}
        </div>
      ) : null}
    </div>
  );
}

function CloseCart({ className }: { className?: string }): ReactElement {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-warm-200/80 text-warm-500 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-800 dark:border-warm-800/60 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-200">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={`h-5 w-5 transition-all ease-spring hover:scale-110 ${className ?? ''}`}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  );
}