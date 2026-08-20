// components/console/reviews/MessageQueue.tsx
//
// Customer messages queue (board 15b): the second of the two side-by-side
// queues on the reviews screen. The artboard shows the queue tab but not the
// card contents, so the cards are the presentational stand-in for incoming
// contact messages.

import type { MessageRow } from './types';

export function MessageQueue({ rows }: { rows: MessageRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-3 text-[12px] text-[var(--adm-ink-3)]">
        Chưa có tin nhắn
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-col gap-1.5 rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-3"
        >
          <span className="text-[12px] font-semibold text-[var(--adm-ink)]">{row.sender}</span>
          <span className="text-[12px] text-[var(--adm-ink-3)]">{row.subject}</span>
          <div className="text-[12px] leading-[1.4] text-[var(--adm-ink-2)]">{row.body}</div>
        </div>
      ))}
    </div>
  );
}
