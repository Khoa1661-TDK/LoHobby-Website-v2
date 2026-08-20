// components/console/marketing/CouponsPanel.tsx
//
// Board 14a — coupon table. Server component: pure presentation over the
// CouponRow[] sample rows. Codes and counts are mono numerics (adm-num); the
// expiry note is quiet secondary ink.

import { PageHeader } from '@/components/console/ui/PageHeader';
import { Button } from '@/components/console/ui/Button';

export interface CouponRow {
  id: string;
  /** Coupon code, verbatim from the artboard. */
  code: string;
  /** Discount value as shown, e.g. '10%' or '50.000 ₫'. */
  value: string;
  /** Validity note, e.g. 'đến 31/08'. */
  validity: string;
  /** Redemption count as shown. */
  used: string;
}

const HEAD_CELLS: { label: string; align: 'left' | 'right' }[] = [
  { label: 'Mã', align: 'left' },
  { label: 'Giá trị', align: 'left' },
  { label: 'Hiệu lực', align: 'left' },
  { label: 'Đã dùng', align: 'right' },
];

export function CouponsPanel({ rows }: { rows: CouponRow[] }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <PageHeader
        title="Mã giảm giá"
        actions={<Button variant="primary">Tạo mã</Button>}
      />
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-[var(--adm-line)]">
            {HEAD_CELLS.map((c) => (
              <th
                key={c.label}
                className={`px-1 py-2 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)] ${
                  c.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id}
              className={i < rows.length - 1 ? 'border-b border-[var(--adm-raised)]' : ''}
            >
              <td className="px-1 py-[9px] font-mono font-semibold text-[var(--adm-ink)]">
                {row.code}
              </td>
              <td className="px-1 py-[9px] font-medium text-[var(--adm-ink)]">{row.value}</td>
              <td className="px-1 py-[9px] text-[var(--adm-ink-3)]">{row.validity}</td>
              <td className="adm-num px-1 py-[9px] font-mono font-semibold text-[var(--adm-ink)]">
                {row.used}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
