// app/profile/orders-panel.tsx
'use client';

import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, type ReactElement } from 'react';
import Price from '@/components/price';
import type { ProfileOrder, ProfileOrderStatus } from '@/app/[locale]/(storefront)/profile/types';

type Props = {
  orders: ProfileOrder[];
};

type StatusStyle = {
  dot: string;
  badge: string;
  card: string;
};

const STATUS_ORDER: ProfileOrderStatus[] = [
  'PENDING_ONLINE',
  'PENDING_COD',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'PENDING',
  'CANCELLED',
];

const STATUS_STYLES: Record<ProfileOrderStatus, StatusStyle> = {
  PENDING_ONLINE: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200',
    card: 'border-amber-200/80 dark:border-amber-500/30',
  },
  PENDING_COD: {
    dot: 'bg-spool-500',
    badge: 'bg-spool-100 text-spool-800 dark:bg-spool-500/15 dark:text-spool-200',
    card: 'border-spool-200/80 dark:border-spool-500/30',
  },
  PAID: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
    card: 'border-emerald-200/80 dark:border-emerald-500/30',
  },
  SHIPPED: {
    dot: 'bg-filament-500',
    badge: 'bg-filament-100 text-filament-800 dark:bg-filament-500/15 dark:text-filament-200',
    card: 'border-filament-200/80 dark:border-filament-500/30',
  },
  DELIVERED: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
    card: 'border-emerald-200/80 dark:border-emerald-500/30',
  },
  PENDING: {
    dot: 'bg-neutral-400',
    badge: 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700/40 dark:text-neutral-200',
    card: 'border-neutral-200 dark:border-neutral-800',
  },
  CANCELLED: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200',
    card: 'border-rose-200/80 dark:border-rose-500/30',
  },
};

const STATUS_LABEL_KEYS: Record<ProfileOrderStatus, string> = {
  PENDING_ONLINE: 'statusLabelPendingOnline',
  PENDING_COD: 'statusLabelPendingCod',
  PAID: 'statusLabelPaid',
  SHIPPED: 'statusLabelShipped',
  DELIVERED: 'statusLabelDelivered',
  PENDING: 'statusLabelPending',
  CANCELLED: 'statusLabelCancelled',
};

const STATUS_DESC_KEYS: Record<ProfileOrderStatus, string> = {
  PENDING_ONLINE: 'statusDescPendingOnline',
  PENDING_COD: 'statusDescPendingCod',
  PAID: 'statusDescPaid',
  SHIPPED: 'statusDescShipped',
  DELIVERED: 'statusDescDelivered',
  PENDING: 'statusDescPending',
  CANCELLED: 'statusDescCancelled',
};

export default function OrdersPanel({ orders }: Props): ReactElement {
  const t = useTranslations('profile');
  const locale = useLocale();

  function formatDateTime(value: string): string {
    return new Date(value).toLocaleString(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  const grouped = useMemo(() => {
    const map = new Map<ProfileOrderStatus, ProfileOrder[]>();
    for (const order of orders) {
      const list = map.get(order.status) ?? [];
      list.push(order);
      map.set(order.status, list);
    }
    return map;
  }, [orders]);

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center shadow-sm dark:border-neutral-700 dark:bg-neutral-950">
        <h2 className="text-lg font-semibold">{t('noOrdersTitle')}</h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {t('noOrdersBody')}
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-full bg-filament-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-filament-600"
        >
          {t('browseProducts')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {STATUS_ORDER.map((status) => {
        const bucket = grouped.get(status);
        if (!bucket || bucket.length === 0) return null;
        const styles = STATUS_STYLES[status];
        const label = t(STATUS_LABEL_KEYS[status] as Parameters<typeof t>[0]);
        const description = t(STATUS_DESC_KEYS[status] as Parameters<typeof t>[0]);

        return (
          <section key={status} aria-labelledby={`orders-${status.toLowerCase()}-heading`}>
            <header className="mb-3 flex items-center gap-3">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${styles.dot}`}
                aria-hidden="true"
              />
              <h2
                id={`orders-${status.toLowerCase()}-heading`}
                className="text-base font-semibold tracking-tight"
              >
                {label}
                <span className="ml-2 text-xs font-medium text-neutral-400">
                  · {bucket.length}
                </span>
              </h2>
            </header>
            <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
            <ul className="grid gap-3">
              {bucket.map((order) => (
                <li
                  key={order.id}
                  className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-neutral-950 ${styles.card}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                          {t('orderTitle', { code: order.orderCode })}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles.badge}`}
                        >
                          {label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {t('orderedAt', { datetime: formatDateTime(order.createdAt) })}
                      </p>
                      {order.paidAt && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {t('paidAt', { datetime: formatDateTime(order.paidAt) })}
                        </p>
                      )}
                      {order.trackingNumber ? (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {order.carrierLabel ? `${order.carrierLabel} · ` : ''}
                          <span className="font-mono">{order.trackingNumber}</span>
                          {order.shipmentStatusLabel ? ` — ${order.shipmentStatusLabel}` : ''}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <Price
                        className="text-base font-bold"
                        amount={order.amount}
                        currencyCode="VND"
                      />
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {t('itemCount', { count: order.itemCount })}
                      </p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-1 gap-2 text-xs text-neutral-500 sm:grid-cols-3 dark:text-neutral-400">
                    <Detail
                      label={t('deliveryLabel')}
                      value={order.deliveryMethod === 'PICKUP' ? t('pickupMethod') : t('homeDelivery')}
                    />
                    <Detail
                      label={t('paymentLabel')}
                      value={
                        order.paymentMethod === 'PAY_ONLINE'
                          ? t('payOnline')
                          : order.paymentMethod === 'COD'
                            ? t('payCOD')
                            : '—'
                      }
                    />
                    <Detail
                      label={t('deliverToLabel')}
                      value={order.shippingAddress ?? '—'}
                      className="sm:col-span-1"
                    />
                  </dl>

                  <div className="mt-4 text-right">
                    <Link
                      href={`/profile/orders/${order.orderCode}`}
                      className="text-sm font-medium text-filament-600 hover:underline dark:text-filament-300"
                    >
                      {t('viewDetails')}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}): ReactElement {
  return (
    <div className={className}>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        {label}
      </dt>
      <dd className="mt-0.5 text-neutral-700 dark:text-neutral-200">{value}</dd>
    </div>
  );
}
