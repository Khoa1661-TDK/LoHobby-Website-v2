// components/checkout/order-status-poller.tsx
'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactElement } from 'react';

type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

type Props = {
  orderCode: number;
  initialStatus: OrderStatus;
};

export default function OrderStatusPoller({
  orderCode,
  initialStatus,
}: Props): ReactElement | null {
  const router = useRouter();

  useEffect(() => {
    if (initialStatus !== 'PENDING') {
      return;
    }

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${orderCode}`, { cache: 'no-store' });
        if (!res.ok || cancelled) {
          return;
        }
        const data = (await res.json()) as { status: OrderStatus };
        if (data.status === 'PAID' || data.status === 'CANCELLED') {
          window.clearInterval(interval);
          router.refresh();
        }
      } catch {
        /* retry on next tick */
      }
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [orderCode, initialStatus, router]);

  return null;
}
