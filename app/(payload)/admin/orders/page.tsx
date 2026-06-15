// app/(payload)/admin/orders/page.tsx — single order-management screen (card grid, action-driven)
import Link from 'next/link';
import type { ReactElement } from 'react';
import Price from '@/components/price';
import { listOrdersForFulfillment } from '@/lib/order-fulfillment';
import { deriveOrderStage, STAGE_BADGE, STAGE_LABELS, stageToTab, type OrderTab } from '@/lib/order-stage';
import OrderActions from './order-actions';

export const dynamic = 'force-dynamic';

const PAYMENT_LABEL: Record<string, string> = {
  pending: 'Chưa TT',
  paid: 'Đã TT',
  failed: 'Thất bại',
  refunded: 'Hoàn tiền',
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

const TAB_LABELS: Record<OrderTab, string> = {
  needs_action: 'Cần xử lý',
  in_transit: 'Đang giao',
  completed: 'Đã giao',
  cancelled_refunded: 'Hủy / Hoàn',
};

const TAB_ORDER: OrderTab[] = ['needs_action', 'in_transit', 'completed', 'cancelled_refunded'];

export default async function AdminOrdersPage(props: {
  searchParams: Promise<{ tab?: string }>;
}): Promise<ReactElement> {
  const { tab: tabParam } = await props.searchParams;
  const activeTab: OrderTab = TAB_ORDER.includes(tabParam as OrderTab)
    ? (tabParam as OrderTab)
    : 'needs_action';

  // listOrdersForFulfillment excludes canceled + failed; fetch all for the Hủy/Hoàn tab.
  const allOrders = await listOrdersForFulfillment(200);
  const withStage = allOrders.map((o) => ({ order: o, stage: deriveOrderStage(o) }));

  const counts: Record<OrderTab, number> = {
    needs_action: 0, in_transit: 0, completed: 0, cancelled_refunded: 0,
  };
  for (const { stage } of withStage) counts[stageToTab(stage)] += 1;

  const visible = withStage.filter(({ stage }) => stageToTab(stage) === activeTab);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Quản trị</p>
          <h1 className="text-2xl font-semibold text-neutral-900">Quản lý đơn hàng</h1>
          <p className="mt-1 max-w-xl text-sm text-neutral-600">
            Mỗi đơn chỉ có một nút thao tác chính. Hệ thống tự cập nhật trạng thái — bạn không cần chọn trạng thái thủ công.
          </p>
        </div>
        <Link
          href="/admin/collections/orders"
          className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
        >
          Xem trong CMS →
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2">
        {TAB_ORDER.map((t) => (
          <Link
            key={t}
            href={`/admin/orders?tab=${t}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === t ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {TAB_LABELS[t]}
            <span className="ml-1.5 text-xs opacity-70">({counts[t]})</span>
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-500">Không có đơn hàng trong mục này.</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map(({ order, stage }) => (
            <article key={String(order.id)} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
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
                  <Price amount={order.totalAmount} currencyCode="VND" className="text-base font-bold" />
                  <div className="mt-1 flex flex-wrap justify-end gap-1">
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase">
                      {PAYMENT_LABEL[order.paymentStatus] ?? order.paymentStatus}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset ${STAGE_BADGE[stage]}`}>
                      {STAGE_LABELS[stage]}
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

              {order.lineItems.length > 0 ? (
                <p className="mt-2 text-xs text-neutral-500">
                  {order.lineItems.map((li) => `${li.productTitle}${li.variantName ? ` (${li.variantName})` : ''} ×${li.quantity}`).join(' · ')}
                </p>
              ) : null}

              {order.trackingNumber ? (
                <div className="mt-3 rounded-lg bg-neutral-50 p-3 text-xs">
                  <p className="font-semibold text-neutral-800">{order.shippingCarrierLabel || 'Đơn vị vận chuyển'}</p>
                  <p className="mt-1 font-mono">{order.trackingNumber}</p>
                  {order.trackingUrl ? (
                    <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-indigo-600 underline">
                      Mở trang theo dõi
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-4 border-t border-neutral-100 pt-4">
                <OrderActions order={order} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}