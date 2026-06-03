'use client';

// src/payload/components/analytics/AnalyticsSalesChart.tsx — revenue chart with VND tooltips
import type { ReactElement } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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
    <div className="dash-chart__tooltip">
      <div className="dash-chart__tooltip-label">{label}</div>
      {payload.map((entry) => {
        const value =
          entry.dataKey === 'revenueVnd'
            ? formatVnd(entry.value ?? 0)
            : String(entry.value ?? 0);
        return (
          <div key={entry.dataKey} className="dash-chart__tooltip-row">
            <span className="dash-chart__tooltip-dot" style={{ background: entry.color }} />
            <span className="dash-chart__tooltip-name">{entry.name}</span>
            <span className="dash-chart__tooltip-value">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

export function AnalyticsSalesChart({ data }: Props): ReactElement {
  const totalRevenue = data.reduce((sum, point) => sum + point.revenueVnd, 0);
  const totalOrders = data.reduce((sum, point) => sum + point.orders, 0);
  const peak = data.reduce(
    (best, point) => (point.revenueVnd > best ? point.revenueVnd : best),
    0,
  );

  return (
    <section className="dash-chart">
      <header className="dash-chart__head">
        <div>
          <h2 className="dash-chart__title">Doanh thu theo ngày</h2>
          <p className="dash-chart__subtitle">Tháng này</p>
        </div>
        <dl className="dash-chart__stats">
          <div className="dash-chart__stat">
            <dt>Tổng doanh thu</dt>
            <dd>{formatVnd(totalRevenue)}</dd>
          </div>
          <div className="dash-chart__stat">
            <dt>Đơn đã thanh toán</dt>
            <dd>{totalOrders.toLocaleString('vi-VN')}</dd>
          </div>
          <div className="dash-chart__stat">
            <dt>Ngày cao nhất</dt>
            <dd>{formatVnd(peak)}</dd>
          </div>
        </dl>
      </header>

      <div className="dash-chart__canvas">
        <ResponsiveContainer height={360} width="100%">
          <ComposedChart data={data} margin={{ bottom: 8, left: 4, right: 12, top: 12 }}>
            <defs>
              <linearGradient id="dashRevenueFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--theme-success-500)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--theme-success-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="var(--theme-elevation-150)"
              strokeDasharray="2 5"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="date"
              height={48}
              interval="preserveStartEnd"
              tick={{ fill: 'var(--theme-elevation-500)', fontSize: 12 }}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: 'var(--theme-elevation-500)', fontSize: 12 }}
              tickFormatter={(value: number) => formatVndAxis(value)}
              tickLine={false}
              width={56}
              yAxisId="revenue"
            />
            <YAxis hide orientation="right" yAxisId="orders" />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--theme-elevation-200)' }} />
            <Legend
              iconType="circle"
              wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }}
            />
            <Area
              dataKey="revenueVnd"
              fill="url(#dashRevenueFill)"
              name="Doanh thu"
              stroke="var(--theme-success-500)"
              strokeWidth={2.5}
              type="monotone"
              yAxisId="revenue"
            />
            <Line
              dataKey="orders"
              dot={false}
              name="Đơn đã thanh toán"
              stroke="var(--theme-elevation-700)"
              strokeDasharray="4 4"
              strokeWidth={2}
              type="monotone"
              yAxisId="orders"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
