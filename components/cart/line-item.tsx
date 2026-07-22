// components/cart/line-item.tsx — one cart line, shared by the cart modal and
// the /cart page so the two cannot drift.
'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactElement } from 'react';
import { Link } from '@/i18n/navigation';
import Price from '@/components/price';
import { useBumpPulse } from '@/lib/animations/hooks/useBumpPulse';
import { toNextImageSrc } from '@/lib/product-image-snapshot';
import type { CartLine } from '@/lib/cart';

type Props = {
  item: CartLine;
  disabled: boolean;
  onRemove: () => void;
  onQuantityChange: (quantity: number) => void;
  onNavigate?: () => void;
};

export default function CartLineItem({
  item,
  disabled,
  onRemove,
  onQuantityChange,
  onNavigate,
}: Props): ReactElement {
  const t = useTranslations('cart');

  return (
    <li className="flex w-full flex-col border-b border-warm-200/50 last:border-b-0 dark:border-warm-800/30">
      <div className="relative flex w-full flex-row justify-between px-1 py-4">
        <div className="absolute z-40 -ml-1 -mt-2">
          <button
            aria-label={t('removeItemAria')}
            disabled={disabled}
            onClick={onRemove}
            className="ease relative flex h-[18px] w-[18px] items-center justify-center rounded-full bg-warm-300 transition-all duration-200 before:absolute before:-inset-3.5 before:content-[''] hover:bg-warm-900 hover:scale-110 disabled:opacity-50 dark:bg-warm-700 dark:hover:bg-warm-100 dark:hover:text-warm-900"
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
            onClick={onNavigate}
            className="z-30 ml-3 flex flex-row"
          >
            <div className="flex flex-1 flex-col text-sm">
              <span className="line-clamp-2 font-medium leading-snug">{item.product.title}</span>
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
              disabled={disabled}
              onClick={() => onQuantityChange(item.quantity - 1)}
            />
            <QtyInput
              quantity={item.quantity}
              disabled={disabled}
              onCommit={onQuantityChange}
            />
            <QtyButton
              type="plus"
              disabled={disabled}
              onClick={() => onQuantityChange(item.quantity + 1)}
            />
          </div>
        </div>
      </div>
    </li>
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
