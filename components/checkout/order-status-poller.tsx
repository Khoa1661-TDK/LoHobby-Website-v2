// components/checkout/order-status-poller.tsx
'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useEffect, useState, type ReactElement } from 'react';

type OrderStatus =
  | 'PENDING'
  | 'PENDING_COD'
  | 'PENDING_ONLINE'
  | 'PENDING_TRANSFER'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

type Props = {
  orderCode: number;
  initialStatus: OrderStatus;
};

const PENDING_STATUSES: ReadonlySet<OrderStatus> = new Set([
  'PENDING',
  'PENDING_ONLINE',
]);
const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 40; // ~2 minutes

export default function OrderStatusPoller({
  orderCode,
  initialStatus,
}: Props): ReactElement | null {
  const router = useRouter();
  const t = useTranslations('checkout.success');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!PENDING_STATUSES.has(initialStatus)) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const interval = window.setInterval(async () => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        window.clearInterval(interval);
        if (!cancelled) setTimedOut(true);
        return;
      }
      try {
        const res = await fetch(`/api/orders/${orderCode}`, { cache: 'no-store' });
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as { status: OrderStatus };
        if (!PENDING_STATUSES.has(data.status)) {
          window.clearInterval(interval);
          router.refresh();
        }
      } catch {
        /* retry on next tick */
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [orderCode, initialStatus, router]);

  if (!PENDING_STATUSES.has(initialStatus)) return null;

  return (
    <p
      role="status"
      aria-live="polite"
      className="mb-4 flex items-center gap-2 rounded-xl border border-line bg-surface-raised px-4 py-3 text-sm text-warm-600 dark:text-warm-400"
    >
      {timedOut ? (
        t('paymentTimeout')
      ) : (
        <>
          <span
            className="h-3 w-3 animate-spin rounded-full border-2 border-warm-400 border-t-transparent"
            aria-hidden
          />
          {t('checkingPayment')}
        </>
      )}
    </p>
  );
}
