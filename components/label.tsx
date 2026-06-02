// components/label.tsx
import clsx from 'clsx';
import type { ReactElement } from 'react';
import Price from '@/components/price';

type Props = {
  title: string;
  amount: string;
  currencyCode: string;
  position?: 'bottom' | 'center';
};

export default function Label({
  title,
  amount,
  currencyCode,
  position = 'bottom',
}: Props): ReactElement {
  return (
    <div
      className={clsx('absolute bottom-0 left-0 flex w-full px-4 pb-4 @container/label', {
        'lg:px-20 lg:pb-[35%]': position === 'center',
      })}
    >
      <div className="flex items-center rounded-xl border border-warm-200/60 bg-white/80 p-1 text-xs font-semibold text-warm-900 backdrop-blur-md dark:border-warm-800/60 dark:bg-warm-900/80 dark:text-warm-100">
        <h3 className="mr-4 line-clamp-2 grow pl-2 leading-none tracking-tight">{title}</h3>
        <Price
          className="flex-none rounded-lg bg-warm-900 p-2 text-warm-50 shadow-soft-sm dark:bg-warm-100 dark:text-warm-900"
          amount={amount}
          currencyCode={currencyCode}
          currencyCodeClassName="hidden @[275px]/label:inline"
        />
      </div>
    </div>
  );
}