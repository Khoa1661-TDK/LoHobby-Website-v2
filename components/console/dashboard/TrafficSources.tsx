// components/console/dashboard/TrafficSources.tsx
//
// "Nguồn truy cập" — a simple label/value list of acquisition channels with
// their session counts. No bars, no colour: just the mono figures right-aligned.

import { Card } from '@/components/console/ui/Card';

export interface TrafficSource {
  label: string;
  value: string;
}

export function TrafficSources({ sources }: { sources: TrafficSource[] }) {
  return (
    <Card className="flex flex-col gap-2">
      <div className="text-[13px] font-semibold text-[var(--adm-ink)]">
        Nguồn truy cập
      </div>
      <div className="flex flex-col gap-1.5">
        {sources.map((source) => (
          <div
            key={source.label}
            className="flex justify-between text-[12px] font-medium text-[var(--adm-ink)]"
          >
            <span>{source.label}</span>
            <span className="font-mono font-semibold">{source.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
