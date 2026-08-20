// components/console/queue/QueueGrid.tsx
//
// The crawl review queue grid. Server component: pure presentation over the
// QueueItem[] handed in. Status pills follow the "pills only" rule; the video
// glyph and the error badge are the canvas's own status marks, not pills.

import { StatusPill } from '@/components/console/ui/StatusPill';
import type { PillTone } from '@/components/console/ui/StatusPill';
import type { QueueItem, QueueStatus } from './QueueTypes';

const STATUS_TONE: Record<QueueStatus, PillTone> = {
  new: 'busy',
  changed: 'wait',
  error: 'fail',
};

const STATUS_LABEL: Record<QueueStatus, string> = {
  new: 'Mới',
  changed: 'Đã thay đổi',
  error: 'Lỗi tải ảnh',
};

const ROW_TINT: Record<QueueStatus, string> = {
  new: 'bg-[var(--adm-well)]',
  changed: 'bg-[var(--adm-wait-bg)]',
  error: 'bg-[var(--adm-fail-bg)]',
};

const HEAD_CELLS: { label: string; align: 'left' | 'right' | 'center' }[] = [
  { label: 'Tiêu đề', align: 'left' },
  { label: 'Giá', align: 'right' },
  { label: 'Biến thể', align: 'left' },
  { label: 'Video', align: 'center' },
  { label: 'Trạng thái', align: 'left' },
  { label: 'Danh mục', align: 'left' },
  { label: 'Thao tác', align: 'right' },
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

function VideoGlyph({ present }: { present: boolean }) {
  if (!present) {
    return (
      <span className="text-[11px] font-medium text-[var(--adm-ink-4)]">—</span>
    );
  }
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--adm-ok-ink)"
      strokeWidth="2.2"
      className="inline-block"
      aria-hidden="true"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function ErrorBadge() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--adm-fail-ink)"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function RowActions({ item }: { item: QueueItem }) {
  if (item.status === 'error') {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="mr-1 inline-flex rounded-[var(--adm-radius)] border border-[var(--adm-line)] px-2.5 py-[5px] text-[11px] font-semibold text-[var(--adm-ink-4)]">
          Duyệt
        </span>
        <span className="inline-flex rounded-[var(--adm-radius)] border border-[var(--adm-fail-ink)] px-2.5 py-[5px] text-[11px] font-semibold text-[var(--adm-fail-ink)]">
          Crawl lại
        </span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="mr-1 inline-flex rounded-[var(--adm-radius)] bg-[var(--adm-action)] px-2.5 py-[5px] text-[11px] font-semibold text-[var(--adm-action-ink)]">
        Duyệt
      </span>
      <span className="inline-flex rounded-[var(--adm-radius)] border border-[var(--adm-line)] px-2.5 py-[5px] text-[11px] font-semibold text-[var(--adm-ink-3)]">
        Từ chối
      </span>
    </span>
  );
}

export function QueueGrid({ items }: { items: QueueItem[] }) {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full table-fixed border-collapse text-[12px]">
        <colgroup>
          <col className="w-[40px]" />
          <col className="w-[52px]" />
          <col />
          <col className="w-[110px]" />
          <col className="w-[90px]" />
          <col className="w-[64px]" />
          <col className="w-[110px]" />
          <col className="w-[110px]" />
          <col className="w-[150px]" />
        </colgroup>
        <thead>
          <tr className="border-b border-[var(--adm-line)]">
            <th className="w-[40px]" />
            <th className="w-[52px]" />
            {HEAD_CELLS.map((c) => (
              <th
                key={c.label}
                className={`px-2 py-[10px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--adm-ink-3)] ${
                  c.align === 'right'
                    ? 'text-right'
                    : c.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                }`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr
              key={item.id}
              className={`${ROW_TINT[item.status]} ${
                i < items.length - 1 ? 'border-b border-[var(--adm-line)]' : ''
              }`}
            >
              <td className="px-2 py-2">
                <RowCheckbox checked={item.selected} />
              </td>
              <td className="px-2 py-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--adm-radius)] bg-[var(--adm-placeholder)]">
                  {item.status === 'error' ? <ErrorBadge /> : null}
                </div>
              </td>
              <td className="overflow-hidden px-2 py-2">
                <span className="block truncate whitespace-nowrap font-medium leading-[1.3] text-[var(--adm-ink)]">
                  {item.title}
                </span>
                {item.changeNote ? (
                  <span className="mt-0.5 block text-[10px] font-semibold text-[var(--adm-wait-ink)]">
                    {item.changeNote}
                  </span>
                ) : null}
              </td>
              <td className="adm-num px-2 py-2">
                {item.price === null ? (
                  <span className="font-mono font-semibold text-[var(--adm-ink-4)]">—</span>
                ) : (
                  <>
                    <span className="block font-mono font-semibold text-[var(--adm-ink)]">
                      {item.price}
                    </span>
                    {item.previousPrice !== null ? (
                      <span className="mt-0.5 block font-mono text-[10px] text-[var(--adm-ink-4)] line-through">
                        {item.previousPrice}
                      </span>
                    ) : null}
                  </>
                )}
              </td>
              <td className="px-2 py-2 font-medium text-[var(--adm-ink-2)]">{item.variant}</td>
              <td className="px-2 py-2 text-center">
                <VideoGlyph present={item.hasVideo} />
              </td>
              <td className="px-2 py-2">
                <StatusPill tone={STATUS_TONE[item.status]}>
                  {STATUS_LABEL[item.status]}
                </StatusPill>
              </td>
              <td className="px-2 py-2 font-medium text-[var(--adm-ink-4)]">{item.category}</td>
              <td className="whitespace-nowrap px-2 py-2 text-right">
                <RowActions item={item} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
