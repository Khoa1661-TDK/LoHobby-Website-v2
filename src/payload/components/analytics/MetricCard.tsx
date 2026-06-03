// src/payload/components/analytics/MetricCard.tsx
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

export type MetricTone = 'revenue' | 'value' | 'orders' | 'paid';

type Props = {
  title: string;
  value: ReactNode;
  change: string;
  icon: ReactNode;
  tone: MetricTone;
};

type TrendDirection = 'up' | 'down' | 'flat';

function getTrend(change: string): TrendDirection {
  if (change.startsWith('+') && change !== '+0%') return 'up';
  if (change.startsWith('-')) return 'down';
  return 'flat';
}

const trendIcon: Record<TrendDirection, ReactNode> = {
  up: <ArrowUpRight size={14} aria-hidden />,
  down: <ArrowDownRight size={14} aria-hidden />,
  flat: <Minus size={14} aria-hidden />,
};

export function MetricCard({ title, value, change, icon, tone }: Props): ReactElement {
  const trend = getTrend(change);

  return (
    <article className={`dash-metric dash-metric--${tone}`}>
      <span className="dash-metric__rail" aria-hidden />
      <header className="dash-metric__head">
        <span className="dash-metric__icon" aria-hidden>
          {icon}
        </span>
        <span className="dash-metric__title">{title}</span>
      </header>
      <div className="dash-metric__value">{value}</div>
      <footer className="dash-metric__foot">
        <span className={`dash-metric__trend dash-metric__trend--${trend}`}>
          {trendIcon[trend]}
          {change}
        </span>
        <span className="dash-metric__hint">so với tháng trước</span>
      </footer>
    </article>
  );
}
