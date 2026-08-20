// components/console/content/PagesList.tsx
//
// Pages list (board 13a): a dense table of site pages — title, path, status.
// Server component: pure presentation over the PageRow[] handed in. The path
// column is mono (it is a URL, not prose). Status is the only chromatic cell,
// carried by StatusPill so the "pills only" rule holds.

import { StatusPill } from '@/components/console/ui/StatusPill';

export interface PageRow {
  id: string;
  /** Page title, verbatim from the artboard. */
  title: string;
  /** URL path, verbatim from the artboard (mono in the artboard). */
  path: string;
  /** 'published' renders the ok pill; 'draft' renders the neutral pill. */
  status: 'published' | 'draft';
}

const STATUS_LABEL: Record<PageRow['status'], { tone: 'ok' | 'neutral'; label: string }> = {
  published: { tone: 'ok', label: 'Đã đăng' },
  draft: { tone: 'neutral', label: 'Nháp' },
};

export function PagesList({ rows }: { rows: PageRow[] }) {
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="border-b border-[var(--adm-line)]">
          <th className="px-1 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
            Tiêu đề
          </th>
          <th className="px-1 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
            Đường dẫn
          </th>
          <th className="px-1 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)]">
            Trạng thái
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={row.id}
            className={i < rows.length - 1 ? 'border-b border-[var(--adm-raised)]' : ''}
          >
            <td className="px-1 py-[9px] font-medium text-[var(--adm-ink)]">{row.title}</td>
            <td className="px-1 py-[9px] font-mono text-[var(--adm-ink-3)]">{row.path}</td>
            <td className="px-1 py-[9px]">
              <StatusPill tone={STATUS_LABEL[row.status].tone}>
                {STATUS_LABEL[row.status].label}
              </StatusPill>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
