// components/console/orders/OrdersList.tsx
//
// Orders list: desktop table (md+) collapsing to the stacked card layout on
// mobile. The header, filter strip, and footer are shared across both.

import type { ReactNode } from 'react';
import { Card } from '@/components/console/ui/Card';
import { StatusPill } from '@/components/console/ui/StatusPill';
import {
  ORDER_LABEL,
  ORDER_TONE,
  PAYMENT_LABEL,
  PAYMENT_TONE,
  type OrderRow,
} from './types';

const TH_CLASS =
  'px-2 py-[9px] text-left text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]';

const TD_CLASS = 'px-2 py-[9px] text-[12px]';

export function OrdersList({ rows }: { rows: OrderRow[] }) {
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="hidden md:block">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-[var(--adm-line)]">
              <th className={TH_CLASS}>Mã đơn</th>
              <th className={TH_CLASS}>Khách hàng</th>
              <th className={`${TH_CLASS} text-right`}>Tổng tiền</th>
              <th className={TH_CLASS}>Thanh toán</th>
              <th className={TH_CLASS}>Trạng thái đơn</th>
              <th className={`${TH_CLASS} text-right`}>Ngày</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="border-b border-[var(--adm-line)] last:border-b-0">
                <td className={`${TD_CLASS} font-mono font-semibold text-[var(--adm-ink)]`}>
                  {row.code}
                </td>
                <td className={`${TD_CLASS} font-medium text-[var(--adm-ink)]`}>
                  {row.customer}
                </td>
                <td className={`${TD_CLASS} adm-num font-mono font-semibold text-[var(--adm-ink)]`}>
                  {row.total}
                </td>
                <td className={TD_CLASS}>
                  <StatusPill tone={PAYMENT_TONE[row.payment]}>{PAYMENT_LABEL[row.payment]}</StatusPill>
                </td>
                <td className={TD_CLASS}>
                  <StatusPill tone={ORDER_TONE[row.order]}>{ORDER_LABEL[row.order]}</StatusPill>
                </td>
                <td className={`${TD_CLASS} adm-num font-mono font-medium text-[var(--adm-ink-3)]`}>
                  {row.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:hidden">
        {rows.map((row) => (
          <div
            key={row.code}
            className={
              'flex flex-col gap-1.5 border-b border-[var(--adm-line)] px-4 py-3.5 last:border-b-0' +
              (row.order === 'shipped' ? ' bg-[var(--adm-well)]' : '')
            }
          >
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[13px] font-bold text-[var(--adm-ink)]">
                {row.code}
              </span>
              <span className="adm-num font-mono text-[13px] font-bold text-[var(--adm-ink)]">
                {row.total}
              </span>
            </div>
            <div className="text-[12px] font-medium text-[var(--adm-ink-2)]">
              {row.customer}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <StatusPill tone={PAYMENT_TONE[row.payment]}>
                {PAYMENT_LABEL[row.payment]}
              </StatusPill>
              <StatusPill tone={ORDER_TONE[row.order]}>{ORDER_LABEL[row.order]}</StatusPill>
            </div>
            {row.order === 'shipped' && (
              <span className="mt-0.5 inline-flex items-center justify-center bg-[var(--adm-action)] px-3 py-[9px] text-[12px] font-bold text-[var(--adm-action-ink)]">
                Đánh dấu đã giao
              </span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function FilterChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--adm-radius)] border border-[var(--adm-line)] px-3 py-[7px] text-[12px] font-medium text-[var(--adm-ink)]">
      {children}
      <IconChevron />
    </span>
  );
}

export function OrdersToolbar() {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex w-full items-center gap-2 rounded-[var(--adm-radius)] bg-[var(--adm-raised)] px-3 py-[7px] text-[var(--adm-ink-3)] md:w-[260px]">
        <IconSearch />
        <span className="text-[12px]">Tìm theo mã đơn, khách hàng...</span>
      </div>
      <FilterChip>Thanh toán: Tất cả</FilterChip>
      <FilterChip>Trạng thái đơn: Tất cả</FilterChip>
      <span className="inline-flex items-center gap-1.5 rounded-[var(--adm-radius)] border border-[var(--adm-wait-dot)] bg-[var(--adm-wait-bg)] px-3 py-[7px] text-[12px] font-semibold text-[var(--adm-wait-ink)]">
        Cần xử lý (7) ✕
      </span>
    </div>
  );
}

export function OrdersFooter({ shown, total }: { shown: string; total: number }) {
  return (
    <div className="border-t border-[var(--adm-line)] px-4 py-3 text-[12px] font-medium text-[var(--adm-ink-3)]">
      Hiển thị {shown} trong {total} đơn hàng
    </div>
  );
}
