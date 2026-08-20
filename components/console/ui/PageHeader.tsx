// components/console/ui/PageHeader.tsx
//
// Screen title row. `actions` is right-aligned via margin-auto rather than
// justify-between so a header with no actions still left-aligns cleanly.

import type { ReactNode } from 'react';

export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-[18px] font-bold leading-none text-[var(--adm-ink)]">{title}</h1>
        {meta ? <div className="text-[12px] text-[var(--adm-ink-3)]">{meta}</div> : null}
      </div>
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
