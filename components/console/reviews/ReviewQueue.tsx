// components/console/reviews/ReviewQueue.tsx
//
// Reviews awaiting moderation (board 15b): a stack of review cards, each with
// the author + star rating, the review body, and Duyệt / Ẩn actions. The
// actions are presentational until the data layer wires moderation up.

import { Button } from '@/components/console/ui/Button';
import type { ReviewRow } from './types';

function Stars({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, rating));
  return (
    <span aria-label={`${rating}/5`}>
      {'★'.repeat(filled)}
      {'☆'.repeat(5 - filled)}
    </span>
  );
}

export function ReviewQueue({ rows }: { rows: ReviewRow[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex flex-col gap-1.5 rounded-[var(--adm-radius)] border border-[var(--adm-line)] bg-[var(--adm-surface)] p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-semibold text-[var(--adm-ink)]">
              {row.author} · <Stars rating={row.rating} />
            </span>
            <div className="flex gap-1.5">
              <Button variant="primary" className="px-2.5 py-1 text-[10px]">
                Duyệt
              </Button>
              <Button variant="secondary" className="px-2.5 py-1 text-[10px]">
                Ẩn
              </Button>
            </div>
          </div>
          <div className="text-[12px] leading-[1.4] text-[var(--adm-ink-2)]">{row.body}</div>
        </div>
      ))}
    </div>
  );
}
