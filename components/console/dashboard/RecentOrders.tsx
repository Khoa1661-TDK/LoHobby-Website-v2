// components/console/dashboard/RecentOrders.tsx
//
// "Đơn hàng gần đây" — the last few orders as compact rows: order number,
// customer, amount, and a status pill. The status pill carries the only colour
// on the row (wait/busy/ok), per the "colour = status" rule.

import { Card } from '@/components/console/ui/Card';
import { StatusPill, type PillTone } from '@/components/console/ui/StatusPill';

export interface RecentOrder {
  code: string;
  customer: string;
  amount: string;
  status: string;
  tone: PillTone;
}

export function RecentOrders({ orders }: { orders: RecentOrder[] }) {
  return (
    <Card className="flex flex-col gap-2 overflow-hidden">
      <div className="text-[13px] font-semibold text-[var(--adm-ink)]">
        Đơn hàng gần đây
      </div>
      <div className="flex flex-col gap-2">
        {orders.map((order) => (
          <div key={order.code} className="flex items-center gap-2">
            <span className="w-[66px] font-mono text-[11px] font-semibold text-[var(--adm-ink)]">
              {order.code}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--adm-ink-2)]">
              {order.customer}
            </span>
            <span className="font-mono text-[12px] font-semibold text-[var(--adm-ink)]">
              {order.amount}
            </span>
            <StatusPill tone={order.tone}>{order.status}</StatusPill>
          </div>
        ))}
      </div>
    </Card>
  );
}
