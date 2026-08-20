// components/console/products/FilterBar.tsx
//
// Search + filter strip above the products table. Presentational: uncontrolled
// inputs, no state — the data layer will wire filtering up later.

import { ConsoleIcon } from '@/components/console/ConsoleIcons';

const FILTERS: { label: string }[] = [
  { label: 'Danh mục' },
  { label: 'Trạng thái' },
  { label: 'Còn hàng' },
];

export function FilterBar() {
  return (
    <div className="flex items-center gap-2.5 border-b border-[var(--adm-line)] px-7 py-[14px]">
      <div className="flex w-[280px] items-center gap-2 rounded-[var(--adm-radius)] bg-[var(--adm-raised)] px-3 py-[7px] text-[var(--adm-ink-3)]">
        <ConsoleIcon name="search" size={14} />
        <input
          type="text"
          placeholder="Tìm theo tên..."
          className="w-full bg-transparent text-[12px] text-[var(--adm-ink)] outline-none placeholder:text-[var(--adm-ink-3)]"
        />
      </div>
      {FILTERS.map((f) => (
        <span
          key={f.label}
          className="inline-flex items-center gap-1.5 rounded-[var(--adm-radius)] border border-[var(--adm-line)] px-3 py-[7px] text-[12px] font-medium text-[var(--adm-ink)]"
        >
          {f.label}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      ))}
      <span className="ml-auto text-[11px] font-medium text-[var(--adm-ink-3)]">
        Sắp xếp: Mới nhất
      </span>
    </div>
  );
}
