// components/console/content/RedirectsList.tsx
//
// Redirects (board 13c): a list of source → target URL pairs. Each row is two
// mono paths with an arrow between them; the source and target are equal-width
// (flex:1) so the arrow sits mid-row. Server component: pure presentation over
// the RedirectRow[] handed in.

export interface RedirectRow {
  id: string;
  /** Source path, verbatim from the artboard. */
  from: string;
  /** Target path, verbatim from the artboard. */
  to: string;
}

function Arrow() {
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
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export function RedirectsList({ rows }: { rows: RedirectRow[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((row, i) => (
        <div
          key={row.id}
          className={`flex items-center gap-3 py-[9px] ${
            i < rows.length - 1 ? 'border-b border-[var(--adm-raised)]' : ''
          }`}
        >
          <span className="flex-1 font-mono text-[12px] font-medium text-[var(--adm-ink)]">
            {row.from}
          </span>
          <Arrow />
          <span className="flex-1 font-mono text-[12px] font-medium text-[var(--adm-ink)]">
            {row.to}
          </span>
        </div>
      ))}
    </div>
  );
}
