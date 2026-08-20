// components/console/categories/CategoryList.tsx
//
// Category tree (board 12): one bordered stack of rows, each with a list glyph,
// the category name, and a product count in mono. The first row is top level;
// the rest are indented children.

export interface CategoryRow {
  id: string;
  name: string;
  count: number;
  /** Indented under the top-level row. */
  child: boolean;
}

function ListGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--adm-ink-3)"
      strokeWidth="2"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

export function CategoryList({ rows }: { rows: CategoryRow[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((row) => (
        <div
          key={row.id}
          className={`flex items-center gap-2 border border-[var(--adm-line)] px-3 py-2.5 ${
            row.child ? 'border-t-0 pl-8' : ''
          }`}
        >
          <ListGlyph />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--adm-ink)]">
            {row.name}
          </span>
          <span className="ml-auto font-mono text-[11px] font-medium text-[var(--adm-ink-3)]">
            {row.count}
          </span>
        </div>
      ))}
    </div>
  );
}
