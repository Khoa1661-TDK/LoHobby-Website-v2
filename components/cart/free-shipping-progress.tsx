// components/cart/free-shipping-progress.tsx
'use client';

import { useTranslations } from 'next-intl';
import type { ReactElement } from 'react';
import Price from '@/components/price';
import { resolveFreeShippingProgress } from '@/lib/free-shipping';

type Props = {
  subtotalVnd: number;
  currencyCode: string;
  thresholdVnd: number;
};

export default function FreeShippingProgress({
  subtotalVnd,
  currencyCode,
  thresholdVnd,
}: Props): ReactElement | null {
  const t = useTranslations('cart');
  const progress = resolveFreeShippingProgress(subtotalVnd, thresholdVnd);

  // null = no threshold configured, so the feature is off entirely.
  if (!progress) return null;

  return (
    <div className="rounded-xl border border-warm-200/60 bg-warm-100/40 px-3 py-2.5 dark:border-warm-800/40 dark:bg-warm-900/40">
      {progress.qualified ? (
        <p className="text-xs font-semibold text-warm-900 dark:text-warm-100">
          {t('freeShippingQualified')}
        </p>
      ) : (
        // A <div>, not a <p>: Price renders its own <p>, and a <p> inside a <p>
        // is invalid DOM that React warns on and jsdom silently reparents.
        <div className="flex flex-wrap items-center gap-1 text-xs text-warm-600 dark:text-warm-400">
          {t.rich('freeShippingRemaining', {
            amount: () => (
              <Price
                amount={progress.remainingVnd}
                currencyCode={currencyCode}
                className="inline font-semibold text-warm-900 dark:text-warm-100"
              />
            ),
          })}
        </div>
      )}
      <div
        role="progressbar"
        aria-label={t('freeShippingProgressAria')}
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-warm-200/80 dark:bg-warm-800/60"
      >
        <div
          className="h-full rounded-full bg-warm-900 transition-all duration-300 dark:bg-warm-100"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
    </div>
  );
}
