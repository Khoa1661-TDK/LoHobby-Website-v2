// components/console/dashboard/KpiCard.tsx
//
// One metric tile on the dashboard header row: a muted label, a large mono
// figure, and a delta line. The delta colour is the only place this card is
// chromatic, and it comes straight from the status triplets — green for up,
// red for down — so it stays within the "pills only, colour = status" rule.

import { Card } from '@/components/console/ui/Card';

export interface Kpi {
  label: string;
  value: string;
  delta: string;
  up: boolean;
}

export function KpiCard({ label, value, delta, up }: Kpi) {
  return (
    <Card className="flex flex-1 flex-col gap-1.5">
      <div className="text-[11px] font-medium text-[var(--adm-ink-3)]">{label}</div>
      <div className="font-mono text-[24px] font-bold leading-none text-[var(--adm-ink)]">
        {value}
      </div>
      <div
        className={`text-[11px] font-semibold ${
          up ? 'text-[var(--adm-ok-ink)]' : 'text-[var(--adm-fail-ink)]'
        }`}
      >
        {delta}
      </div>
    </Card>
  );
}
