// src/payload/components/analytics/MetricCard.tsx
import type { ReactElement, ReactNode } from 'react';

type Props = {
  title: string;
  value: ReactNode;
  change: string;
};

export function MetricCard({ title, value, change }: Props): ReactElement {
  const isPositive = change.startsWith('+') || change === '0%';

  return (
    <div
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-border-color)',
        borderRadius: 'var(--style-radius-m)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        justifyContent: 'space-between',
        minHeight: '7rem',
        padding: '1rem',
        width: '100%',
      }}
    >
      <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: '0.875rem' }}>
        <span
          style={{
            color: isPositive ? 'var(--color-success-500)' : 'var(--theme-error-500)',
            fontWeight: 700,
            marginRight: '0.25rem',
          }}
        >
          {change}
        </span>
        so với tháng trước
      </div>
    </div>
  );
}
