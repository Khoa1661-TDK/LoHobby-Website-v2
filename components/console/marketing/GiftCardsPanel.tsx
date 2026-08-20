// components/console/marketing/GiftCardsPanel.tsx
//
// Board 14b — gift card list. Server component: a bordered stack of rows, each
// with a code (mono), a face value (mono), and a remaining / exhausted note.
// "Exhausted" is the only chromatic mark here and it is fail-tone ink, not a
// pill — the canvas draws it as plain text.

import { PageHeader } from '@/components/console/ui/PageHeader';

export interface GiftCardRow {
  id: string;
  /** Card code, verbatim from the artboard. */
  code: string;
  /** Face value as shown, e.g. '200.000 ₫'. */
  value: string;
  /** Remaining note, e.g. 'còn 120.000 ₫', or 'đã dùng hết' when spent. */
  note: string;
  /** Card fully redeemed — the note renders in fail ink. */
  exhausted: boolean;
}

export function GiftCardsPanel({ rows }: { rows: GiftCardRow[] }) {
  return (
    <div className="flex flex-col gap-[14px]">
      <PageHeader title="Thẻ quà tặng" />
      <div className="flex flex-col gap-[2px]">
        {rows.map((row, i) => (
          <div
            key={row.id}
            className={`flex items-center gap-3 py-[9px] ${
              i < rows.length - 1 ? 'border-b border-[var(--adm-line)]' : ''
            }`}
          >
            <span className="flex-1 font-mono font-semibold text-[var(--adm-ink)]">
              {row.code}
            </span>
            <span className="font-mono font-semibold text-[var(--adm-ink)]">{row.value}</span>
            <span
              className={`text-[11px] ${
                row.exhausted ? 'text-[var(--adm-fail-ink)]' : 'text-[var(--adm-ink-3)]'
              }`}
            >
              {row.note}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
