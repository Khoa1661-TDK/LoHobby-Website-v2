// components/price.tsx
import clsx from 'clsx';
import type { ReactElement } from 'react';

type Props = {
  amount: string | number;
  className?: string;
  currencyCode?: string;
  currencyCodeClassName?: string;
};

const formatter = new Intl.NumberFormat('vi-VN');

export default function Price({
  amount,
  className,
  currencyCode = 'VND',
  currencyCodeClassName,
}: Props): ReactElement {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  return (
    <p suppressHydrationWarning className={className}>
      {formatter.format(safe)}
      <span className={clsx('ml-1 inline', currencyCodeClassName)}>{currencyCode}</span>
    </p>
  );
}
