// components/console/dashboard/RevenueChart.tsx
//
// The "Doanh thu theo thời gian" sparkline. A fixed 560×200 coordinate space,
// stretched to the card with preserveAspectRatio="none". The line and the
// area fill are both ink — the palette has no accent to spend on charts, so
// the chart is monochrome by design.

import { Card } from '@/components/console/ui/Card';
import type { RevenueSeries } from '@/lib/console/dashboard';

export function RevenueChart({ series }: { series: RevenueSeries }) {
  return (
    <Card className="flex flex-col gap-2.5">
      <div className="text-[13px] font-semibold text-[var(--adm-ink)]">
        Doanh thu theo thời gian (VND)
      </div>
      <svg viewBox="0 0 560 200" preserveAspectRatio="none" className="w-full flex-1">
        {series.points ? (
          <>
            <polygon points={series.area} fill="var(--adm-ink)" opacity="0.06" />
            <polyline
              points={series.points}
              fill="none"
              stroke="var(--adm-ink)"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          </>
        ) : null}
      </svg>
      <div className="flex justify-between font-mono text-[10px] font-medium text-[var(--adm-ink-4)]">
        {series.days.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
    </Card>
  );
}
