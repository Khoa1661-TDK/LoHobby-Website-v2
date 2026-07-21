// components/price.tsx
import clsx from 'clsx';
import type { ReactElement } from 'react';

type Props = {
  amount: string | number;
  className?: string;
  currencyCode?: string;
  currencyCodeClassName?: string;
};

// currencyCode is a free-text field in Payload's StoreSettings global (no enum/ISO
// validation — see src/payload/globals/StoreSettings.ts), so an admin could in theory
// save a non-ISO-4217 value. Intl.NumberFormat throws a RangeError for those, so cache
// per-code and fall back to plain grouped digits + a literal code span when construction
// fails, instead of crashing the whole price render.
const currencyFormatters = new Map<string, Intl.NumberFormat | null>();
const plainFormatter = new Intl.NumberFormat('vi-VN');

function getCurrencyFormatter(currencyCode: string): Intl.NumberFormat | null {
  if (currencyFormatters.has(currencyCode)) {
    return currencyFormatters.get(currencyCode)!;
  }
  let formatter: Intl.NumberFormat | null;
  try {
    formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: currencyCode });
  } catch {
    formatter = null;
  }
  currencyFormatters.set(currencyCode, formatter);
  return formatter;
}

export default function Price({
  amount,
  className,
  currencyCode = 'VND',
  currencyCodeClassName,
}: Props): ReactElement {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const safe = Number.isFinite(n) ? n : 0;
  const formatter = getCurrencyFormatter(currencyCode);

  if (formatter) {
    return (
      <p suppressHydrationWarning className={className}>
        {formatter.format(safe)}
      </p>
    );
  }

  // Invalid/unsupported currency code — fall back to the previous plain-digits + literal
  // code rendering rather than throwing.
  return (
    <p suppressHydrationWarning className={className}>
      {plainFormatter.format(safe)}
      <span className={clsx('ml-1 inline', currencyCodeClassName)}>{currencyCode}</span>
    </p>
  );
}
