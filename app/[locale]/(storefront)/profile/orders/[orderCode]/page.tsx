import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import Price from '@/components/price';
import OrderTimeline from '@/components/animations/OrderTimeline';
import ShipmentTracker from '@/components/orders/shipment-tracker';
import { getPublicShipmentInfo } from '@/lib/order-fulfillment';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import { mapPayloadOrderToStorefrontStatus } from '@/lib/payload-order-storefront';
import { orderStatusLabelKey } from '@/lib/order-status-labels';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipment/types';
import CancelOrderButton from './cancel-order-button';
import ReorderButton from './reorder-button';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('profile.orderDetail');
  return {
    title: t('metaTitle'),
    robots: { index: false, follow: false },
  };
}

type Params = Promise<{ orderCode: string }>;

const TIMELINE = ['pending', 'paid', 'shipped', 'delivered'] as const;

function formatDateTime(value: string | Date, locale: string): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString(locale === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function timelineIndex(doc: {
  paymentStatus?: string | null;
  orderStatus?: string | null;
}): number {
  if (doc.orderStatus === 'canceled') return -1;
  if (doc.orderStatus === 'delivered') return 3;
  if (doc.orderStatus === 'shipped') return 2;
  if (doc.paymentStatus === 'paid') return 1;
  return 0;
}

export default async function OrderDetailPage(props: { params: Params }): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/profile');
  }

  const { orderCode } = await props.params;
  const parsed = Number(orderCode);
  if (!Number.isInteger(parsed)) notFound();

  const order = await getPayloadOrderByCode(parsed);
  if (!order) notFound();

  const meta = order.metadata as { prismaUserId?: string } | null | undefined;
  const ownsOrder =
    meta?.prismaUserId === session.user.id ||
    (typeof order.buyerEmail === 'string' &&
      order.buyerEmail.toLowerCase() === session.user.email?.toLowerCase());
  if (!ownsOrder) notFound();

  const t = await getTranslations('profile.orderDetail');
  const ts = await getTranslations('checkout.statusLabels');
  const locale = await getLocale();
  const status = mapPayloadOrderToStorefrontStatus(order);

  const isCancelled = order.orderStatus === 'canceled';
  const currentStep = timelineIndex(order);
  const items = Array.isArray(order.lineItems) ? order.lineItems : [];
  const createdAt =
    typeof order.createdAt === 'string' ? order.createdAt : new Date().toISOString();

  const shipment = getPublicShipmentInfo(order);
  const hasTracking = Boolean(shipment.trackingNumber);

  const initialTracking = hasTracking
    ? {
        orderCode: parsed,
        orderStatus: shipment.orderStatus,
        carrierLabel: shipment.carrierLabel,
        trackingNumber: shipment.trackingNumber,
        trackingUrl: shipment.trackingUrl,
        shipmentStatus: shipment.shipmentStatus,
        shipmentStatusLabel: shipment.shipmentStatus
          ? SHIPMENT_STATUS_LABELS[shipment.shipmentStatus as ShipmentStatus]
          : null,
        shipmentEvents: shipment.shipmentEvents,
        shippedAt: shipment.shippedAt,
        deliveredAt: shipment.deliveredAt,
      }
    : null;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm">
        <Link href="/profile?tab=orders" className="text-neutral-500 hover:underline">
          ← {t('backToOrders')}
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('orderNumberPrefix')}
            {order.orderId}
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {t('orderedAtPrefix')} {formatDateTime(createdAt, locale)}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
            isCancelled
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'
              : order.orderStatus === 'delivered'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
                : order.orderStatus === 'shipped'
                  ? 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200'
          }`}
        >
          {ts(orderStatusLabelKey(status))}
        </span>
      </header>

      {!isCancelled ? (
        <OrderTimeline
          currentStep={currentStep}
          steps={TIMELINE.map((step) => ({
            key: step,
            label:
              step === 'pending'
                ? t('stageOrdered')
                : step === 'paid'
                  ? t('stagePayment')
                  : step === 'shipped'
                    ? t('stageDelivery')
                    : t('stageDone'),
          }))}
        />
      ) : null}

      <div className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map((item, index) => {
            const row = item as Record<string, unknown>;
            const title =
              typeof row.productTitle === 'string' ? row.productTitle : t('itemsHeading');
            const handle = typeof row.productHandle === 'string' ? row.productHandle : '';
            const qty = typeof row.quantity === 'number' ? row.quantity : 0;
            const unit = typeof row.unitPrice === 'number' ? row.unitPrice : 0;
            return (
              <li key={index} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  {handle ? (
                    <Link href={`/product/${handle}`} className="font-medium hover:underline">
                      {title}
                    </Link>
                  ) : (
                    <span className="font-medium">{title}</span>
                  )}
                  {typeof row.variantName === 'string' ? (
                    <p className="text-xs text-neutral-500">{row.variantName}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {t('qtyAbbrev')} {qty} × <Price amount={unit} currencyCode="VND" className="inline" />
                  </p>
                </div>
                <Price amount={unit * qty} currencyCode="VND" className="shrink-0 font-medium" />
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-neutral-200 p-4 dark:border-neutral-800">
          <span className="font-semibold">{t('total')}</span>
          <Price
            amount={typeof order.totalAmount === 'number' ? order.totalAmount : 0}
            currencyCode="VND"
            className="text-lg font-bold"
          />
        </div>
      </div>

      <dl className="mt-6 space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-sm dark:border-neutral-800 dark:bg-neutral-900">
        {order.deliveryMethod && (
          <div className="flex justify-between border-b border-neutral-200 py-2 dark:border-neutral-800">
            <dt className="text-neutral-500">{t('deliveryHeading')}</dt>
            <dd>{order.deliveryMethod === 'PICKUP' ? t('deliveryPickup') : t('deliveryShipment')}</dd>
          </div>
        )}
        {order.paymentKind && (
          <div className="flex justify-between border-b border-neutral-200 py-2 dark:border-neutral-800">
            <dt className="text-neutral-500">{t('paymentHeading')}</dt>
            <dd>
              {order.paymentKind === 'cod'
                ? t('paymentCod')
                : order.paymentKind === 'manual_transfer'
                  ? t('paymentBankTransfer')
                  : t('paymentOnline')}
            </dd>
          </div>
        )}
        {order.shippingAddress && (
          <div className="flex justify-between gap-4 border-b border-neutral-200 py-2 dark:border-neutral-800">
            <dt className="shrink-0 text-neutral-500">{t('shippingHeading')}</dt>
            <dd className="text-right">{order.shippingAddress}</dd>
          </div>
        )}
      </dl>

      {hasTracking ? (
        <ShipmentTracker orderCode={parsed} initial={initialTracking} />
      ) : order.deliveryMethod === 'SHIPMENT' && order.paymentStatus === 'paid' ? (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
          <p className="text-sm text-neutral-500">{t('preparingShipment')}</p>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <ReorderButton orderId={String(order.id)} />
        {order.orderStatus === 'pending' || order.orderStatus === 'processing' ? (
          <CancelOrderButton orderId={String(order.id)} />
        ) : null}
      </div>
    </section>
  );
}
