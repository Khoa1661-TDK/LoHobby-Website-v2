// components/console/dashboard/TopProductsTable.tsx
//
// "Top sản phẩm theo CTR" — a fixed-layout table of product, impressions,
// clicks and CTR. Numeric columns use .adm-num; CTR is the ok tone, the one
// chromatic column.

import { Card } from '@/components/console/ui/Card';

export interface TopProductRow {
  name: string;
  impressions: string;
  clicks: string;
  ctr: string;
}

const HEADERS = [
  { label: 'Sản phẩm', align: 'left' },
  { label: 'Lượt hiện', align: 'right' },
  { label: 'Nhấp', align: 'right' },
  { label: 'CTR', align: 'right' },
] as const;

export function TopProductsTable({ rows }: { rows: TopProductRow[] }) {
  return (
    <Card className="flex flex-col gap-2 overflow-hidden">
      <div className="text-[13px] font-semibold text-[var(--adm-ink)]">
        Top sản phẩm theo CTR
      </div>
      <table className="w-full table-fixed border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-[var(--adm-line)]">
            {HEADERS.map((header) => (
              <th
                key={header.label}
                className={`px-1 py-1.5 text-[10px] font-semibold uppercase text-[var(--adm-ink-3)] ${
                  header.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.name} className={i < rows.length - 1 ? 'border-b border-[var(--adm-raised)]' : ''}>
              <td className="px-1 py-[7px]">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 flex-none bg-[var(--adm-raised)]" />
                  <span className="block truncate font-medium text-[var(--adm-ink)]">
                    {row.name}
                  </span>
                </div>
              </td>
              <td className="adm-num px-1 py-[7px] font-mono text-[12px] font-semibold text-[var(--adm-ink)]">
                {row.impressions}
              </td>
              <td className="adm-num px-1 py-[7px] font-mono text-[12px] font-semibold text-[var(--adm-ink)]">
                {row.clicks}
              </td>
              <td className="adm-num px-1 py-[7px] font-mono text-[12px] font-bold text-[var(--adm-ok-ink)]">
                {row.ctr}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
