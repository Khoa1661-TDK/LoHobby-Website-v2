// components/console/marketing/AutoSalePanel.tsx
//
// Board 14d — auto-sale settings. Server component: a bordered settings row
// with the on/off toggle reflecting the auto-sale-settings global, the
// managed-products count, and a table of the products currently under
// management with their applied discount. The toggle is read-only; turning
// auto-sale on or off is a write and stays in the Payload admin.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { StatusPill } from '@/components/console/ui/StatusPill';

export interface AutoSaleProductRow {
  id: string;
  /** Product title, verbatim from the artboard. */
  title: string;
  /** Price as shown, e.g. '129.000 ₫'. */
  price: string;
  /** Applied discount as shown, e.g. '−15%'. */
  discount: string;
}

function ToggleOn() {
  return (
    <span className="relative inline-block h-5 w-9 rounded-full bg-[var(--adm-action)]">
      <span className="absolute right-[2px] top-[2px] h-4 w-4 rounded-full bg-[var(--adm-action-ink)]" />
    </span>
  );
}

function ToggleOff() {
  return (
    <span className="relative inline-block h-5 w-9 rounded-full bg-[var(--adm-line)]">
      <span className="absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-[var(--adm-action-ink)]" />
    </span>
  );
}

export function AutoSalePanel({
  facts,
}: {
  facts: { enabled: boolean; managedCount: number; rows: AutoSaleProductRow[] };
}) {
  return (
    <div className="flex flex-col gap-[14px]">
      <PageHeader title="Tự động giảm giá" />
      <div className="flex items-center gap-2.5 rounded-[var(--adm-radius)] border border-[var(--adm-line)] p-3">
        <span className="flex-1 font-medium text-[var(--adm-ink)]">
          Chạy hằng đêm lúc 02:00 · giảm giá top 10% sản phẩm xem nhiều nhất
        </span>
        {facts.enabled ? <ToggleOn /> : <ToggleOff />}
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
        Sản phẩm hiện đang được quản lý ({facts.managedCount})
      </div>
      <table className="w-full border-collapse text-[12px]">
        <tbody>
          {facts.rows.map((row, i) => (
            <tr
              key={row.id}
              className={i < facts.rows.length - 1 ? 'border-b border-[var(--adm-raised)]' : ''}
            >
              <td className="px-1 py-2 font-medium text-[var(--adm-ink)]">{row.title}</td>
              <td className="adm-num px-1 py-2 font-mono font-semibold text-[var(--adm-ink)]">
                {row.price}
              </td>
              <td className="px-1 py-2 text-right">
                <StatusPill tone="busy">{row.discount}</StatusPill>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
