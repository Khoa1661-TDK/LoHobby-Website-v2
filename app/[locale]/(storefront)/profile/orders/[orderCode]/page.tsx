import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { notFound, redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { auth } from '@/auth';
import Price from '@/components/price';
import ShipmentTracker from '@/components/orders/shipment-tracker';
import { getPublicShipmentInfo } from '@/lib/order-fulfillment';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipment/types';
import ReorderButton from './reorder-button';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Chi tiết đơn hàng',
  robots: { index: false, follow: false },
};

type Params = Promise<{ orderCode: string }>;

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao hàng',
  delivered: 'Đã giao',
  canceled: 'Đã hủy',
  paid: 'Đã thanh toán',
};

const TIMELINE = ['pending', 'paid', 'shipped', 'delivered'] as const;

function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toLocaleString('vi-VN', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusLabel(doc: {
  paymentStatus?: string | null;
  orderStatus?: string | null;
}): string {
  if (doc.orderStatus === 'canceled') return STATUS_LABEL.canceled ?? 'Đã hủy';
  if (doc.orderStatus === 'delivered') return STATUS_LABEL.delivered ?? 'Đã giao';
  if (doc.orderStatus === 'shipped') return STATUS_LABEL.shipped ?? 'Đang giao';
  if (doc.paymentStatus === 'paid') return STATUS_LABEL.paid ?? 'Đã thanh toán';
  return STATUS_LABEL.pending ?? 'Chờ xử lý';
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
          ← Lịch sử đơn hàng
        </Link>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Đơn #{order.orderId}</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            Đặt lúc {formatDateTime(createdAt)}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
            isCancelled
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200'
              : order.orderStatus === 'delivered'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200'
          }`}
        >
          {statusLabel(order)}
        </span>
      </header>

      {!isCancelled ? (
        <ol className="mt-8 flex flex-wrap gap-4">
          {TIMELINE.map((step, index) => {
            const done = currentStep >= index;
            return (
              <li key={step} className="flex items-center gap-2 text-sm">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-500' : 'bg-neutral-300'}`}
                />
                <span className={done ? 'font-medium' : 'text-neutral-500'}>
                  {step === 'pending'
                    ? 'Đặt hàng'
                    : step === 'paid'
                      ? 'Thanh toán'
                      : step === 'shipped'
                        ? 'Giao hàng'
                        : 'Hoàn tất'}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="mt-8 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {items.map((item, index) => {
            const row = item as Record<string, unknown>;
            const title = typeof row.productTitle === 'string' ? row.productTitle : 'Sản phẩm';
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
                    SL {qty} × <Price amount={unit} currencyCode="VND" className="inline" />
                  </p>
                </div>
                <Price amount={unit * qty} currencyCode="VND" className="shrink-0 font-medium" />
              </li>
            );
          })}
        </ul>
        <div className="flex items-center justify-between border-t border-neutral-200 p-4 dark:border-neutral-800">
          <span className="font-semibold">Tổng cộng</span>
          <Price
            amount={typeof order.totalAmount === 'number' ? order.totalAmount : 0}
            currencyCode="VND"
            className="text-lg font-bold"
          />
        </div>
      </div>

      {hasTracking ? (
        <ShipmentTracker orderCode={parsed} initial={initialTracking} />
      ) : order.deliveryMethod === 'SHIPMENT' && order.paymentStatus === 'paid' ? (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-300 p-4 dark:border-neutral-700">
          <p className="text-sm text-neutral-500">
            Đơn hàng đang được chuẩn bị. Thông tin vận chuyển sẽ hiển thị khi shop giao cho đơn
            vị vận chuyển.
          </p>
        </div>
      ) : null}

      <div className="mt-6">
        <ReorderButton orderId={String(order.id)} />
      </div>
    </section>
  );
}
