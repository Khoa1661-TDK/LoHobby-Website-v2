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

      <section
        style={{
          marginTop: '2.5rem',
          padding: '1.25rem',
          borderRadius: '0.75rem',
          border: '1px solid var(--theme-elevation-150)',
          background: 'var(--theme-elevation-50)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Commerce</h2>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: 'var(--theme-elevation-600)' }}>
          Tạo mã giảm giá và thẻ quà tặng cho checkout.
        </p>
        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            listStyle: 'none',
            margin: '1rem 0 0',
            padding: 0,
          }}
        >
          <li>
            <a
              href="/admin/coupons"
              style={{
                display: 'inline-block',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--theme-elevation-150)',
                background: 'var(--theme-elevation-0)',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Mã giảm giá
            </a>
          </li>
          <li>
            <a
              href="/admin/gift-cards"
              style={{
                display: 'inline-block',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--theme-elevation-150)',
                background: 'var(--theme-elevation-0)',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Thẻ quà tặng
            </a>
          </li>
          <li>
            <a
              href="/admin/collections/orders"
              style={{
                display: 'inline-block',
                padding: '0.5rem 0.875rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--theme-elevation-150)',
                background: 'var(--theme-elevation-0)',
                fontSize: '0.875rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Quản lý đơn hàng
            </a>
          </li>
        </ul>
      </section>
    </Gutter>
  );
}

export default AnalyticsDashboard;
