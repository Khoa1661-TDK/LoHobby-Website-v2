// components/console/products/ProductsTable.tsx
//
// The dense products table. Server component: pure presentation over the
// ProductRow[] handed in. Checkboxes are uncontrolled per the artboard.

import { StatusPill } from '@/components/console/ui/StatusPill';
import type { ProductRow } from './ProductRowType';

const LOW_STOCK = 5;

const HEAD_CELLS: { label: string; align: 'left' | 'right' }[] = [
  { label: 'Tên sản phẩm', align: 'left' },
  { label: 'Danh mục', align: 'left' },
  { label: 'Giá', align: 'right' },
  { label: 'Tồn kho', align: 'right' },
  { label: 'Khuyến mãi', align: 'left' },
  { label: 'Đăng bán', align: 'left' },
];

function RowCheckbox({ checked }: { checked: boolean }) {
  return (
    <span
      className={`relative inline-block h-4 w-4 shrink-0 rounded-[var(--adm-radius)] border-[1.5px] ${
        checked
          ? 'border-[var(--adm-action)] bg-[var(--adm-action)]'
          : 'border-[var(--adm-ink-4)] bg-transparent'
      }`}
    >
      {checked ? (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--adm-action-ink)"
          strokeWidth="3"
          className="absolute inset-0"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : null}
    </span>
  );
}

export function ProductsTable({ rows }: { rows: ProductRow[] }) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full table-fixed border-collapse text-[12px]">
        <colgroup>
          <col className="w-[40px]" />
          <col className="w-[52px]" />
          <col />
          <col className="w-[110px]" />
          <col className="w-[110px]" />
          <col className="w-[90px]" />
          <col className="w-[130px]" />
          <col className="w-[100px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--adm-line)]">
            <th className="w-[40px]" />
            <th className="w-[52px]" />
            {HEAD_CELLS.map((c) => (
              <th
                key={c.label}
                className={`px-2 py-[9px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)] ${
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
              className={`bg-[var(--adm-well)] ${
                i < rows.length - 1 ? 'border-b border-[var(--adm-line)]' : ''
              }`}
            >
              <td className="px-2 py-[7px]">
                <RowCheckbox checked={row.selected} />
              </td>
              <td className="px-2 py-[7px]">
                <div className="h-9 w-9 rounded-[var(--adm-radius)] bg-[var(--adm-placeholder)]" />
              </td>
              <td className="overflow-hidden px-2 py-[7px] font-medium text-[var(--adm-ink)]">
                <span className="flex items-center gap-1.5">
                  <span className="truncate whitespace-nowrap">{row.name}</span>
                  {row.autoDiscountNote ? (
                    <span
                      title={row.autoDiscountNote}
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[var(--adm-busy-bg)] text-[9px] font-bold text-[var(--adm-busy-ink)]"
                    >
                      A
                    </span>
                  ) : null}
                </span>
              </td>
              <td className="px-2 py-[7px] font-medium text-[var(--adm-ink-2)]">{row.category}</td>
              <td
                className={`adm-num px-2 py-[7px] font-mono font-semibold ${
                  row.promo ? 'text-[var(--adm-ink-4)]' : 'text-[var(--adm-ink)]'
                }`}
              >
                {row.price.toLocaleString('vi-VN')} ₫
              </td>
              <td
                className={`adm-num px-2 py-[7px] font-mono font-semibold ${
                  row.stock <= LOW_STOCK ? 'text-[var(--adm-fail-ink)]' : 'text-[var(--adm-ink)]'
                }`}
              >
                {row.stock}
              </td>
              <td className="px-2 py-[7px]">
                {row.promo ? (
                  <StatusPill tone="busy">{row.promo}</StatusPill>
                ) : (
                  <span className="font-medium text-[var(--adm-ink-4)]">—</span>
                )}
              </td>
              <td className="px-2 py-[7px]">
                {row.status === 'listed' ? (
                  <StatusPill tone="ok">Đang bán</StatusPill>
                ) : (
                  <StatusPill tone="neutral">Nháp</StatusPill>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
