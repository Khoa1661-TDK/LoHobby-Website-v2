// components/console/customers/CustomerList.tsx
//
// Customer list (board 15a): a flat table of customer name, contact, order
// count and total spend. Presentational fixtures for now; the data layer
// implements these shapes later.

export interface CustomerRow {
  id: string;
  name: string;
  contact: string;
  orderCount: number;
  totalSpent: string;
}

const TH_CLASS =
  'px-1 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]';

const TD_CLASS = 'px-1 py-[9px] text-[12px]';

export function CustomerList({ rows }: { rows: CustomerRow[] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-[var(--adm-line)]">
          <th className={TH_CLASS}>Tên</th>
          <th className={TH_CLASS}>Liên hệ</th>
          <th className={`${TH_CLASS} text-right`}>Số đơn</th>
          <th className={`${TH_CLASS} text-right`}>Tổng chi tiêu</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} className="border-b border-[var(--adm-raised)] last:border-b-0">
            <td className={`${TD_CLASS} font-medium text-[var(--adm-ink)]`}>{row.name}</td>
            <td className={`${TD_CLASS} text-[var(--adm-ink-3)]`}>{row.contact}</td>
            <td className={`${TD_CLASS} adm-num font-mono font-semibold text-[var(--adm-ink)]`}>
              {row.orderCount}
            </td>
            <td className={`${TD_CLASS} adm-num font-mono font-semibold text-[var(--adm-ink)]`}>
              {row.totalSpent}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
