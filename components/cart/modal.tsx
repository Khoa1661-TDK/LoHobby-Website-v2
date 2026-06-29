// components/cart/modal.tsx
'use client';

import { Dialog, Transition } from '@headlessui/react';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
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
import Price from '@/components/price';
import { useBumpPulse } from '@/lib/animations/hooks/useBumpPulse';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import {
  removeItemAction,
  updateItemAction,
} from '@/components/cart/actions';
import type { Cart } from '@/lib/cart';

type Props = { cart: Cart };

export default function CartModal({ cart }: Props): ReactElement {
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
                    className="mt-6 inline-flex rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-medium text-warm-50 transition-all duration-200 hover:bg-warm-800 dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
                  >
                    {t('exploreNow')}
                  </Link>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between overflow-hidden p-1">
                  <ul className="flex-grow overflow-auto py-4">
                    {cart.lines
                      .sort((a, b) => a.product.title.localeCompare(b.product.title))
                      .map((item, idx) => (
                        <li
                          key={item.id}
                          className="flex w-full flex-col border-b border-warm-200/50 last:border-b-0 dark:border-warm-800/30"
                        >
                          <div className="relative flex w-full flex-row justify-between px-1 py-4">
                            <div className="absolute z-40 -ml-1 -mt-2">
                              <button
                                aria-label={t('removeItemAria')}
                                disabled={isPending}
                                onClick={() =>
                                  startTransition(async () => {
                                    await removeItemAction(
                                      item.merchandiseId,
                                      item.variantSku,
                                    );
                                    refresh();
                                  })
                                }
                                className="ease relative flex h-[18px] w-[18px] items-center justify-center rounded-full bg-warm-300 transition-all duration-200 before:absolute before:-inset-3.5 before:content-[''] hover:bg-terracotta-500 hover:scale-110 disabled:opacity-50 dark:bg-warm-700 dark:hover:bg-terracotta-600"
                              >
                                <CloseIcon className="h-3.5 w-3.5 text-white" />
                              </button>
                            </div>
                            <div className="flex flex-row">
                              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-warm-200/60 bg-warm-100/50 dark:border-warm-800/40 dark:bg-warm-900/50">
                                <Image
                                  className="img-fit p-1"
                                  width={64}
                                  height={64}
                                  alt={item.product.featuredImage.altText || item.product.title}
                                  src={toNextImageSrc(item.product.featuredImage.url)}
                                />
                              </div>
                              <Link
                                href={`/product/${item.handle}`}
                                onClick={closeCart}
                                className="z-30 ml-3 flex flex-row"
                              >
                                <div className="flex flex-1 flex-col text-sm">
                                  <span className="line-clamp-2 font-medium leading-snug">
                                    {item.product.title}
                                  </span>
                                  {item.variantName ? (
                                    <span className="mt-0.5 text-xs text-warm-500 dark:text-warm-400">
                                      {item.variantName}
                                    </span>
                                  ) : null}
                                </div>
                              </Link>
                            </div>
                            <div className="flex h-16 flex-col items-end justify-between">
                              <Price
                                className="text-sm font-semibold"
                                amount={item.lineTotal.amount}
                                currencyCode={item.lineTotal.currencyCode}
                              />
                              <div className="flex items-center rounded-lg border border-warm-200/60 dark:border-warm-800/40">
                                <QtyButton
                                  type="minus"
                                  disabled={isPending}
                                  onClick={() =>
                                    startTransition(async () => {
                                      await updateItemAction(
                                        item.merchandiseId,
                                        item.quantity - 1,
                                        item.variantSku,
                                      );
                                      refresh();
                                    })
                                  }
                                />
                                <QtyInput
                                  quantity={item.quantity}
                                  disabled={isPending}
                                  onCommit={(value) =>
                                    startTransition(async () => {
                                      await updateItemAction(
                                        item.merchandiseId,
                                        value,
                                        item.variantSku,
                                      );
                                      refresh();
                                    })
                                  }
                                />
                                <QtyButton
                                  type="plus"
                                  disabled={isPending}
                                  onClick={() =>
                                    startTransition(async () => {
                                      await updateItemAction(
                                        item.merchandiseId,
                                        item.quantity + 1,
                                        item.variantSku,
                                      );
                                      refresh();
                                    })
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                  </ul>

                  <CartCrossSell
                    excludeHandles={cart.lines.map((line) => line.handle)}
                  />

                  <div className="py-4 text-sm text-warm-500 dark:text-warm-400">
                    <div className="mb-2 flex items-center justify-between border-b border-warm-200/30 pb-2 dark:border-warm-800/20">
                      <span>{t('tax')}</span>
                      <Price
                        className="text-sm font-medium text-warm-900 dark:text-warm-100"
                        amount="0"
                        currencyCode={cart.cost.totalAmount.currencyCode}
                      />
                    </div>
                    <div className="mb-2 flex items-center justify-between border-b border-warm-200/30 pb-2 dark:border-warm-800/20">
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

                  <Link
                    href="/checkout"
                    onClick={closeCart}
                    className="block w-full rounded-xl bg-warm-900 py-3 text-center text-sm font-semibold text-warm-50 shadow-soft-md transition-all duration-200 hover:bg-warm-800 hover:shadow-soft-lg active:scale-[0.98] dark:bg-warm-100 dark:text-warm-900 dark:hover:bg-warm-200"
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
      className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-warm-200/80 text-warm-600 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-900 dark:border-warm-800/60 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-200"
    >
      <ShoppingCartIcon
        className={`h-4 w-4 transition-all ease-spring hover:scale-110 ${className ?? ''}`}
      />
      {quantity ? (
        <div
          ref={badgeRef}
          className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-terracotta-500 px-1 text-[10px] font-bold text-white shadow-sm dark:bg-terracotta-400 dark:text-warm-950"
        >
          {quantity}
        </div>
      ) : null}
    </div>
  );
}

function CloseCart({ className }: { className?: string }): ReactElement {
  return (
    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-warm-200/80 text-warm-500 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-800 dark:border-warm-800/60 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-200">
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

function CloseIcon({ className }: { className?: string }): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function QtyInput({
  quantity,
  disabled,
  onCommit,
}: {
  quantity: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}): ReactElement {
  const t = useTranslations('cart');
  const [value, setValue] = useState(String(quantity));
  const inputRef = useBumpPulse<HTMLInputElement>(quantity);

  // Re-sync the field with the canonical quantity after a server refresh
  // (e.g. the value was clamped, or +/- buttons changed it).
  useEffect(() => {
    setValue(String(quantity));
  }, [quantity]);

  const commit = (): void => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed === quantity) {
      setValue(String(quantity));
      return;
    }
    onCommit(parsed);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={t('quantityAria')}
      disabled={disabled}
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      className="w-8 bg-transparent text-center text-sm tabular-nums text-warm-900 outline-none focus:ring-0 disabled:opacity-50 dark:text-warm-100"
    />
  );
}

function QtyButton({
  type,
  disabled,
  onClick,
}: {
  type: 'plus' | 'minus';
  disabled: boolean;
  onClick: () => void;
}): ReactElement {
  const t = useTranslations('cart');
  return (
    <button
      type="button"
      aria-label={type === 'plus' ? t('increaseQtyAria') : t('decreaseQtyAria')}
      disabled={disabled}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-warm-500 transition-all duration-200 hover:bg-warm-100/60 hover:text-warm-800 disabled:opacity-40 dark:text-warm-400 dark:hover:bg-warm-800/50 dark:hover:text-warm-200"
    >
      {type === 'plus' ? <PlusIcon /> : <MinusIcon />}
    </button>
  );
}

function PlusIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-3.5 w-3.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function MinusIcon(): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="h-3.5 w-3.5"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  );
}