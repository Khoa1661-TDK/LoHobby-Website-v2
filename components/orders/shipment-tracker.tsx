// components/orders/shipment-tracker.tsx — live shipment tracking with auto-refresh
'use client';

import { useEffect, useState, type ReactElement } from 'react';

type ShipmentEvent = {
  status: string;
  message: string;
  location?: string | null;
  occurredAt: string;
};

type TrackingPayload = {
  orderCode: number;
  orderStatus: string;
  carrierLabel: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: string | null;
  shipmentStatusLabel: string | null;
  shipmentEvents: ShipmentEvent[];
  shippedAt: string | null;
  deliveredAt: string | null;
};

type Props = {
  orderCode: number;
  initial?: TrackingPayload | null;
};

const POLL_MS = 30_000;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function ShipmentTracker({ orderCode, initial }: Props): ReactElement | null {
  const [data, setData] = useState<TrackingPayload | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    let cancelled = false;

    async function fetchTracking(): Promise<void> {
      try {
        const res = await fetch(`/api/orders/${orderCode}/tracking`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = (await res.json()) as TrackingPayload;
        if (!cancelled) setData(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchTracking();
    const interval = setInterval(() => {
      void fetchTracking();
    }, POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderCode]);

  if (loading && !data) {
    return (
      <div className="mt-6 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
        <p className="text-sm text-neutral-500">Đang tải thông tin vận chuyển…</p>
      </div>
    );
  }

  if (!data?.trackingNumber) return null;

  const isDelivered = data.shipmentStatus === 'delivered' || data.orderStatus === 'delivered';

  return (
    <div className="mt-6 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Theo dõi vận chuyển</h2>
          {data.carrierLabel ? (
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              Đơn vị: {data.carrierLabel}
            </p>
          ) : null}
          <p className="mt-1 font-mono text-sm">{data.trackingNumber}</p>
        </div>
        {data.shipmentStatusLabel ? (
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              isDelivered
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
                : 'bg-filament-100 text-filament-800 dark:bg-filament-500/15 dark:text-filament-200'
            }`}
          >
            {data.shipmentStatusLabel}
          </span>
        ) : null}
      </div>

      {data.trackingUrl ? (
        <a
          href={data.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-sm font-medium text-filament-600 underline dark:text-filament-400"
        >
          Mở trang theo dõi của đơn vị vận chuyển
        </a>
      ) : null}

      {data.shipmentEvents.length > 0 ? (
        <ol className="mt-5 space-y-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          {[...data.shipmentEvents].reverse().map((event, index) => (
            <li key={`${event.status}-${event.occurredAt}-${index}`} className="flex gap-3">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                  index === 0 ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
              />
              <div>
                <p className="text-sm font-medium">{event.message}</p>
                {event.location ? (
                  <p className="text-xs text-neutral-500">{event.location}</p>
                ) : null}
                <p className="text-xs text-neutral-400">{formatDateTime(event.occurredAt)}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {data.deliveredAt ? (
        <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">
          Giao hàng thành công lúc {formatDateTime(data.deliveredAt)}
        </p>
      ) : null}
    </div>
  );
}
