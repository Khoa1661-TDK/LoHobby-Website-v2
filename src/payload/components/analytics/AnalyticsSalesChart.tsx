'use client';

// src/payload/components/analytics/AnalyticsSalesChart.tsx — revenue chart with VND tooltips
import type { ReactElement } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatVnd, formatVndAxis } from '@/lib/analytics/currency';
import type { DailySalesPoint } from '@/lib/analytics/dashboard';

type Props = {
  data: DailySalesPoint[];
};

type TooltipPayload = {
  color?: string;
  name?: string;
  value?: number;
  dataKey?: string;
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}): ReactElement | null {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: 'var(--theme-elevation-0)',
        border: '1px solid var(--theme-border-color)',
        borderRadius: '6px',
        fontSize: '13px',
        padding: '0.75rem',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{label}</div>
      {payload.map((entry) => {
        const value =
          entry.dataKey === 'revenueVnd'
            ? formatVnd(entry.value ?? 0)
            : String(entry.value ?? 0);
        return (
          <div key={entry.dataKey} style={{ color: entry.color, marginTop: '0.25rem' }}>
            {entry.name}: {value}
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsSalesChart({ data }: Props): ReactElement {
  return (
    <div
      style={{
        background: 'var(--theme-elevation-50)',
        border: '1px solid var(--theme-border-color)',
        borderRadius: 'var(--style-radius-m)',
        marginTop: '2rem',
        padding: '1.5rem',
      }}
    >
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
        Doanh thu theo ngày (tháng này)
      </h3>
      <ResponsiveContainer height={400} width="100%">
        <LineChart
          data={data}
          margin={{ bottom: 10, left: 8, right: 16, top: 20 }}
        >
          <CartesianGrid stroke="var(--theme-border-color)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            angle={-25}
            dataKey="date"
            height={60}
            interval="preserveStartEnd"
            textAnchor="end"
            tick={{ fill: 'var(--theme-elevation-800)', fontSize: 12 }}
          />
          <YAxis
            tick={{ fill: 'var(--theme-elevation-800)', fontSize: 12 }}
            tickFormatter={(value: number) => formatVndAxis(value)}
            yAxisId="revenue"
          />
          <YAxis hide orientation="right" yAxisId="orders" />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }} />
          <Line
            dataKey="revenueVnd"
            dot={false}
            name="Doanh thu"
            stroke="var(--color-blue-500)"
            strokeWidth={2}
            type="monotone"
            yAxisId="revenue"
          />
          <Line
            dataKey="orders"
            dot={false}
            name="Đơn đã thanh toán"
            stroke="var(--color-success-500)"
            strokeWidth={2}
            type="monotone"
            yAxisId="orders"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
