// src/payload/components/AnalyticsDashboard.tsx — admin dashboard with VND analytics
import { Gutter, RenderTitle, SetStepNav } from '@payloadcms/ui';
import type { PayloadRequest } from 'payload';
import type { ReactElement } from 'react';
import { formatVnd } from '@/lib/analytics/currency';
import {
  buildDailySalesChart,
  computeMonthlyMetrics,
  fetchOrdersInRange,
  formatPercentChange,
  getMonthRange,
} from '@/lib/analytics/dashboard';
import { AnalyticsSalesChart } from '@/src/payload/components/analytics/AnalyticsSalesChart';
import { MetricCard } from '@/src/payload/components/analytics/MetricCard';

type DashboardProps = {
  payload: PayloadRequest['payload'];
};

export async function AnalyticsDashboard(_props: DashboardProps): Promise<ReactElement> {
  const now = new Date();
  const { start: currentStart, end: currentEnd } = getMonthRange(0, now);
  const { start: lastStart, end: lastEnd } = getMonthRange(-1, now);

  const [currentOrders, lastOrders] = await Promise.all([
    fetchOrdersInRange(currentStart, currentEnd),
    fetchOrdersInRange(lastStart, lastEnd),
  ]);

  const currentMetrics = computeMonthlyMetrics(currentOrders);
  const lastMetrics = computeMonthlyMetrics(lastOrders);
  const salesData = buildDailySalesChart(currentOrders);

  return (
    <Gutter>
      <SetStepNav nav={[{ label: 'Analytics', url: '/admin' }]} />
      <RenderTitle className="dashboard__label" title="Analytics" />

      <ul
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          listStyle: 'none',
          margin: '2rem 0 0',
          padding: 0,
        }}
      >
        <li>
          <MetricCard
            title="Doanh thu (VND)"
            value={formatVnd(currentMetrics.revenueVnd)}
            change={formatPercentChange(currentMetrics.revenueVnd, lastMetrics.revenueVnd)}
          />
        </li>
        <li>
          <MetricCard
            title="Giá trị đơn TB"
            value={formatVnd(currentMetrics.avgOrderVnd)}
            change={formatPercentChange(currentMetrics.avgOrderVnd, lastMetrics.avgOrderVnd)}
          />
        </li>
        <li>
          <MetricCard
            title="Tổng đơn"
            value={currentMetrics.totalOrders.toLocaleString('vi-VN')}
            change={formatPercentChange(currentMetrics.totalOrders, lastMetrics.totalOrders)}
          />
        </li>
        <li>
          <MetricCard
            title="Đơn đã thanh toán"
            value={currentMetrics.paidOrders.toLocaleString('vi-VN')}
            change={formatPercentChange(currentMetrics.paidOrders, lastMetrics.paidOrders)}
          />
        </li>
      </ul>

      <AnalyticsSalesChart data={salesData} />
    </Gutter>
  );
}

export default AnalyticsDashboard;
