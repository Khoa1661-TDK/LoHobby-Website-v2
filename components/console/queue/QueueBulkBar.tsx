// components/console/queue/QueueBulkBar.tsx
//
// Bulk-action strip shown over the selected queue rows. Presentational: the
// checkbox is uncontrolled (checked in the artboard) and the actions are inert
// until the data layer lands.

const ACTIONS: { label: string; primary?: boolean }[] = [
  { label: 'Duyệt hàng loạt', primary: true },
  { label: 'Gán danh mục' },
  { label: 'Điều chỉnh giá ±%' },
  { label: 'Từ chối' },
];

export function QueueBulkBar({ selectedCount }: { selectedCount: number }) {
  return (
    <div className="flex items-center gap-4 bg-[var(--adm-action)] px-7 py-3">
      <label className="flex items-center gap-2 text-[12px] font-semibold text-[var(--adm-action-ink)]">
        <span className="relative inline-block h-4 w-4 shrink-0 rounded-[var(--adm-radius)] border-[1.5px] border-[var(--adm-action-ink)] bg-[var(--adm-action-ink)]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--adm-action)"
            strokeWidth="3"
            className="absolute inset-0"
            aria-hidden="true"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </span>
        {selectedCount} sản phẩm được chọn
      </label>
      {ACTIONS.map((a) =>
        a.primary ? (
          <span
            key={a.label}
            className="inline-flex rounded-[var(--adm-radius)] bg-[var(--adm-action-ink)] px-3 py-1.5 text-[12px] font-bold text-[var(--adm-action)]"
          >
            {a.label}
          </span>
        ) : (
          <span
            key={a.label}
            className="inline-flex rounded-[var(--adm-radius)] border border-[var(--adm-action-ink)] px-3 py-1.5 text-[12px] font-semibold text-[var(--adm-action-ink)]"
          >
            {a.label}
          </span>
        ),
      )}
      <span className="ml-auto text-[11px] font-medium text-[var(--adm-action-ink-2)]">
        Bỏ chọn
      </span>
    </div>
  );
}
