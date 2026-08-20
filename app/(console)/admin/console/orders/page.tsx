// app/(console)/admin/console/orders/page.tsx
//
// Orders list. Server component; the AppShell chrome comes from the group
// layout, so this page only supplies the content stack.

import { PageHeader } from '@/components/console/ui/PageHeader';
import {
  OrdersList,
  OrdersToolbar,
  OrdersFooter,
} from '@/components/console/orders/OrdersList';
import { countOrders, listOrderRows } from '@/lib/console/orders';

export default async function OrdersPage() {
  const [rows, counts] = await Promise.all([listOrderRows(25), countOrders()]);
  const unshippedNotice = `${counts.unshipped} đã thanh toán, chưa giao`;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Đơn hàng"
        meta={
          <span className="flex items-center gap-2">
            <span className="rounded-[var(--adm-radius)] bg-[var(--adm-raised)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--adm-ink-3)]">
              {counts.total}
            </span>
            <span className="text-[12px] text-[var(--adm-ink-3)]">{unshippedNotice}</span>
          </span>
        }
      />
      <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)]">
        <div className="border-b border-[var(--adm-line)] px-4 py-3">
          <OrdersToolbar />
        </div>
        <OrdersList rows={rows} />
        <OrdersFooter shown={`1–${rows.length}`} total={counts.total} />
      </div>
    </div>
  );
}
