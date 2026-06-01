// app/(payload)/admin/orders/page.tsx — order fulfillment management dashboard
import Link from 'next/link';
import type { ReactElement } from 'react';
import Price from '@/components/price';
import { isOrderNeedingFulfillment } from '@/lib/order-fulfillment-eligibility';
import { listOrdersForFulfillment } from '@/lib/order-fulfillment';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipment/types';
import { FulfillmentControls } from '@/src/payload/components/FulfillmentControls';

export const dynamic = 'force-dynamic';

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  canceled: 'Đã hủy',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'Chưa TT',
  paid: 'Đã TT',
  failed: 'Thất bại',
  refunded: 'Hoàn tiền',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

type Tab = 'needs_action' | 'in_transit' | 'completed';

function filterOrders(
  orders: Awaited<ReturnType<typeof listOrdersForFulfillment>>,
  tab: Tab,
) {
  switch (tab) {
    case 'needs_action':
      return orders.filter((o) =>
        isOrderNeedingFulfillment({
          paymentStatus: o.paymentStatus,
          orderStatus: o.orderStatus,
          paymentKind: o.paymentKind,
          confirmedAt: o.confirmedAt,
          trackingNumber: o.trackingNumber,
          deliveryMethod: o.deliveryMethod,
        }),
      );
    case 'in_transit':
      return orders.filter(
        (o) =>
          o.trackingNumber &&
          o.shipmentStatus !== 'delivered' &&
          o.orderStatus !== 'delivered',
      );
    case 'completed':
      return orders.filter((o) => o.orderStatus === 'delivered');
    default:
      return orders;
  }
}

export default async function AdminOrdersFulfillmentPage(props: {
  searchParams: Promise<{ tab?: string }>;
}): Promise<ReactElement> {
  const { tab: tabParam } = await props.searchParams;
  const tab: Tab =
    tabParam === 'in_transit' || tabParam === 'completed' ? tabParam : 'needs_action';

  const allOrders = await listOrdersForFulfillment(150);
  const orders = filterOrders(allOrders, tab);

  const counts = {
    needs_action: filterOrders(allOrders, 'needs_action').length,
    in_transit: filterOrders(allOrders, 'in_transit').length,
    completed: filterOrders(allOrders, 'completed').length,
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'needs_action', label: 'Cần xử lý', count: counts.needs_action },
    { id: 'in_transit', label: 'Đang vận chuyển', count: counts.in_transit },
    { id: 'completed', label: 'Đã giao', count: counts.completed },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Quản trị
          </p>
          <h1 className="text-2xl font-semibold text-neutral-900">Quản lý đơn hàng</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            Xác nhận đơn, giao cho đơn vị vận chuyển (GHN, GHTK, …), theo dõi vận đơn và tự động
            hoàn tất khi giao thành công.
          </p>
        </div>
        <Link
          href="/admin/collections/orders"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Payload CMS →
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/admin/orders?tab=${t.id}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs opacity-70">({t.count})</span>
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-500">Không có đơn hàng trong mục này.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <article
              key={String(order.id)}
              className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">#{order.orderCode}</h2>
                  <p className="text-sm text-neutral-600">{order.customerName}</p>
                  <p className="text-xs text-neutral-400">
                    {formatDateTime(order.createdAt)}
                    {order.buyerEmail ? ` · ${order.buyerEmail}` : ''}
                  </p>
                </div>
                <div className="text-right">
                  <Price
                    amount={order.totalAmount}
                    currencyCode="VND"
                    className="text-base font-bold"
                  />
                  <div className="mt-1 flex flex-wrap justify-end gap-1">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
                    </span>
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-800">
                      {ORDER_STATUS_LABEL[order.orderStatus] ?? order.orderStatus}
                    </span>
                  </div>
                </div>
              </div>

              {order.shippingAddress ? (
                <p className="mt-3 text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-400">Giao đến: </span>
                  {order.shippingAddress}
                </p>
              ) : null}

              {order.shipmentStatus ? (
                <p className="mt-2 text-xs font-medium text-filament-700">
                  {SHIPMENT_STATUS_LABELS[order.shipmentStatus as ShipmentStatus]}
                </p>
              ) : null}

              <div className="mt-4 border-t border-neutral-100 pt-4">
                <FulfillmentControls order={order} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
