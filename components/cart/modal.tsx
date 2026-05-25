// components/cart/modal.tsx
'use client';

import { Dialog, Transition } from '@headlessui/react';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactElement,
} from 'react';
import LoadingDots from '@/components/loading-dots';
import Price from '@/components/price';
import {
  checkoutAction,
  removeItemAction,
  updateItemAction,
} from '@/components/cart/actions';
import type { Cart } from '@/lib/cart';

type Props = { cart: Cart };

export default function CartModal({ cart }: Props): ReactElement {
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
      <button aria-label="Open toybox" onClick={openCart}>
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
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>
          <Transition.Child
            as={Fragment}
            enter="transition-all ease-in-out duration-300"
            enterFrom="translate-x-full"
            enterTo="translate-x-0"
            leave="transition-all ease-in-out duration-200"
            leaveFrom="translate-x-0"
            leaveTo="translate-x-full"
          >
            <Dialog.Panel className="fixed bottom-0 right-0 top-0 flex h-full w-full flex-col border-l border-neutral-200 bg-white/80 p-6 text-black backdrop-blur-xl md:w-[390px] dark:border-neutral-700 dark:bg-black/80 dark:text-white">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">My toybox</p>
                <button aria-label="Close toybox" onClick={closeCart}>
                  <CloseCart />
                </button>
              </div>

              {cart.lines.length === 0 ? (
                <div className="mt-20 flex w-full flex-col items-center justify-center overflow-hidden">
                  <ShoppingCartIcon className="h-16 text-filament-400" />
                  <p className="mt-6 text-center text-2xl font-bold">Your toybox is empty.</p>
                  <p className="mt-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
                    Pick something articulated, fidgety, or glow-in-the-dark.
                  </p>
                </div>
              ) : (
                <div className="flex h-full flex-col justify-between overflow-hidden p-1">
                  <ul className="flex-grow overflow-auto py-4">
                    {cart.lines
                      .sort((a, b) => a.product.title.localeCompare(b.product.title))
                      .map((item) => (
                        <li
                          key={item.id}
                          className="flex w-full flex-col border-b border-neutral-300 dark:border-neutral-700"
                        >
                          <div className="relative flex w-full flex-row justify-between px-1 py-4">
                            <div className="absolute z-40 -ml-1 -mt-2">
                              <button
                                aria-label="Remove cart item"
                                disabled={isPending}
                                onClick={() =>
                                  startTransition(async () => {
                                    await removeItemAction(item.merchandiseId);
                                    refresh();
                                  })
                                }
                                className="ease flex h-[17px] w-[17px] items-center justify-center rounded-full bg-neutral-500 transition-all duration-200 disabled:opacity-50"
                              >
                                <CloseIcon className="mx-[1px] h-4 w-4 text-white dark:text-black" />
                              </button>
                            </div>
                            <div className="flex flex-row">
                              <div className="relative h-16 w-16 overflow-hidden rounded-md border border-neutral-300 bg-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                                <Image
                                  className="h-full w-full object-cover"
                                  width={64}
                                  height={64}
                                  alt={item.product.featuredImage.altText || item.product.title}
                                  src={item.product.featuredImage.url}
                                />
                              </div>
                              <Link
                                href={`/product/${item.handle}`}
                                onClick={closeCart}
                                className="z-30 ml-2 flex flex-row space-x-4"
                              >
                                <div className="flex flex-1 flex-col text-base">
                                  <span className="leading-tight">{item.product.title}</span>
                                </div>
                              </Link>
                            </div>
                            <div className="flex h-16 flex-col justify-between">
                              <Price
                                className="flex justify-end space-y-2 text-right text-sm"
                                amount={item.lineTotal.amount}
                                currencyCode={item.lineTotal.currencyCode}
                              />
                              <div className="ml-auto flex h-9 flex-row items-center rounded-full border border-neutral-200 dark:border-neutral-700">
                                <QtyButton
                                  type="minus"
                                  disabled={isPending}
                                  onClick={() =>
                                    startTransition(async () => {
                                      await updateItemAction(
                                        item.merchandiseId,
                                        item.quantity - 1,
                                      );
                                      refresh();
                                    })
                                  }
                                />
                                <p className="w-6 text-center">
                                  <span className="w-full text-sm">{item.quantity}</span>
                                </p>
                                <QtyButton
                                  type="plus"
                                  disabled={isPending}
                                  onClick={() =>
                                    startTransition(async () => {
                                      await updateItemAction(
                                        item.merchandiseId,
                                        item.quantity + 1,
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

                  <div className="py-4 text-sm text-neutral-500 dark:text-neutral-400">
                    <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 dark:border-neutral-700">
                      <p>Taxes</p>
                      <Price
                        className="text-right text-base text-black dark:text-white"
                        amount="0"
                        currencyCode={cart.cost.totalAmount.currencyCode}
                      />
                    </div>
                    <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 pt-1 dark:border-neutral-700">
                      <p>Shipping</p>
                      <p className="text-right">Calculated at checkout</p>
                    </div>
                    <div className="mb-3 flex items-center justify-between border-b border-neutral-200 pb-1 pt-1 dark:border-neutral-700">
                      <p>Total</p>
                      <Price
                        className="text-right text-base text-black dark:text-white"
                        amount={cart.cost.totalAmount.amount}
                        currencyCode={cart.cost.totalAmount.currencyCode}
                      />
                    </div>
                  </div>

                  <form action={checkoutAction}>
                    <CheckoutButton />
                  </form>
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
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-black transition-colors dark:border-neutral-700 dark:text-white">
      <ShoppingCartIcon
        className={`h-4 transition-all ease-in-out hover:scale-110 ${className ?? ''}`}
      />
      {quantity ? (
        <div className="absolute right-0 top-0 -mr-2 -mt-2 h-4 w-4 rounded-sm bg-filament-500 text-[11px] font-medium text-white">
          {quantity}
        </div>
      ) : null}
    </div>
  );
}

function CloseCart({ className }: { className?: string }): ReactElement {
  return (
    <div className="relative flex h-11 w-11 items-center justify-center rounded-md border border-neutral-200 text-black transition-colors dark:border-neutral-700 dark:text-white">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className={`h-6 transition-all ease-in-out hover:scale-110 ${className ?? ''}`}
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
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
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
  return (
    <button
      type="button"
      aria-label={type === 'plus' ? 'Increase item quantity' : 'Decrease item quantity'}
      disabled={disabled}
      onClick={onClick}
      className="ease flex h-full min-w-[36px] max-w-[36px] flex-none items-center justify-center rounded-full p-2 transition-all duration-200 hover:border-neutral-800 hover:opacity-80 disabled:opacity-50 dark:hover:border-neutral-600"
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
      className="h-4 w-4 dark:text-neutral-500"
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
      className="h-4 w-4 dark:text-neutral-500"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  );
}

function CheckoutButton(): ReactElement {
  // useFormStatus available via 'react-dom' — but to avoid extra dep flow we use simple submit.
  return (
    <button
      type="submit"
      className="block w-full rounded-full bg-filament-500 p-3 text-center text-sm font-medium text-white shadow-sm hover:bg-filament-600"
    >
      Proceed to Checkout
    </button>
  );
}

export function CheckoutSpinner(): ReactElement {
  return <LoadingDots className="bg-white" />;
}
