// lib/console/dashboard.ts
//
// Dashboard adapter for the admin console. Assembles six metric shapes from
// three sources: the Payload order analytics summary, the Prisma traffic and
// funnel event tables, and the Payload recent-order list. The pure builders
// below are unit-tested; the async reader just fetches and hands the raw rows
// to them.
//
// No regular expressions: Tailwind scans lib/ and a character class here has
// previously broken the whole stylesheet.

import prisma from '@/lib/prisma';
import type { Order } from '@/src/payload/payload-types';
import { getOrderAnalyticsSummary } from '@/lib/analytics/orders';
import { getTrafficBySource } from '@/lib/analytics/traffic';
import { listRecentOrders } from '@/lib/payload-orders';
import { toOrderRow } from '@/lib/console/orders';
import {
  formatCount,
  formatDayMonth,
  formatOrderCode,
  formatPercent,
  formatVndSymbol,
} from './format';
import type { Kpi } from '@/components/console/dashboard/KpiCard';
import type { RecentOrder } from '@/components/console/dashboard/RecentOrders';
import type { TopProductRow } from '@/components/console/dashboard/TopProductsTable';
import type { TrafficSource } from '@/components/console/dashboard/TrafficSources';
import type { FunnelStage } from '@/components/console/dashboard/ConversionFunnel';
import { ORDER_LABEL, ORDER_TONE } from '@/components/console/orders/types';

export type RevenueSeries = {
  points: string;
  area: string;
  days: string[];
};

const EMPTY_SERIES: RevenueSeries = { points: '', area: '', days: [] };

const CHART_WIDTH = 540;
const CHART_BASELINE = 180;
const CHART_FLOOR = 200;

/**
 * Maps daily revenue onto the chart's fixed 560×200 coordinate space: x
 * spread evenly across 0…540, y inverted (higher revenue → smaller y) and
 * clamped to 0…180. A flat series (all equal, including all-zero) sits on the
 * 180 baseline; fewer than two days yields an empty series.
 */
export function buildRevenueSeries(
  daily: Array<{ date: string; revenueVnd: number }>,
): RevenueSeries {
  if (daily.length < 2) return EMPTY_SERIES;

  const values = daily.map((day) => day.revenueVnd);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  const step = CHART_WIDTH / (daily.length - 1);
  const points = daily.map((day, i) => {
    const x = Math.round(i * step);
    const y = span === 0 ? CHART_BASELINE : Math.round(CHART_BASELINE - ((day.revenueVnd - min) / span) * CHART_BASELINE);
    return `${x},${y}`;
  });

  return {
    points: points.join(' '),
    area: `${points.join(' ')} ${CHART_WIDTH},${CHART_FLOOR} 0,${CHART_FLOOR}`,
    days: daily.map((day) => formatDayMonth(day.date)),
  };
}

// Fixed by the design. ConversionFunnel keys its ok-tone fill off the exact
// string 'Mua hàng', so these must not drift.
const FUNNEL_LABELS = ['Lượt xem sản phẩm', 'Thêm giỏ hàng', 'Mua hàng'] as const;

const MIN_STAGE_WIDTH = 2;

/**
 * The three funnel bars: labels fixed by the design, values grouped counts,
 * widths relative to the first stage (floored at 2% so a tiny stage stays
 * visible), and the drop-off to the next stage on every bar but the last.
 * Zero views means no relative widths and no drop-offs at all.
 */
export function buildFunnel(views: number, addToCarts: number, purchases: number): FunnelStage[] {
  // A tuple rather than an array so indexing is not `T | undefined` under
  // noUncheckedIndexedAccess, and so the count list can never fall out of step
  // with FUNNEL_LABELS.
  const counts: readonly [number, number, number] = [views, addToCarts, purchases];

  return FUNNEL_LABELS.map((label, i) => {
    const count = counts[i] ?? 0;
    const stage: FunnelStage = {
      label,
      value: formatCount(count),
      width: i === 0 ? '100%' : `${MIN_STAGE_WIDTH}%`,
    };

    if (views > 0 && i > 0) {
      stage.width = `${Math.max(Math.round((count / views) * 100), MIN_STAGE_WIDTH)}%`;
    }

    const next = counts[i + 1];
    if (next !== undefined && views > 0) {
      stage.drop = `↓ ${formatPercent(((count - next) / views) * 100)}`;
    }

    return stage;
  });
}

/**
 * The dashboard's recent-order row, derived from the orders adapter's row so
 * the 'canceled' → 'cancelled' translation and the customer-name fallback stay
 * in one place.
 */
export function toRecentOrder(doc: Order): RecentOrder {
  const row = toOrderRow(doc);
  return {
    code: row.code,
    customer: row.customer,
    amount: row.total,
    status: ORDER_LABEL[row.order],
    tone: ORDER_TONE[row.order],
  };
}

type CtrRow = { productId: string; impressions: number; clicks: number };

function toTopProductRows(rows: CtrRow[], titles: Map<string, string>): TopProductRow[] {
  const withCtr = rows
    .filter((row) => row.impressions > 0)
    .map((row) => ({ ...row, ctr: (row.clicks / row.impressions) * 100 }))
    .sort((a, b) => b.ctr - a.ctr)
    .slice(0, 3);

  return withCtr.map((row) => ({
    name: titles.get(row.productId) ?? row.productId,
    impressions: formatCount(row.impressions),
    clicks: formatCount(row.clicks),
    ctr: formatPercent(row.ctr),
  }));
}

function toTrafficSources(sources: Array<{ source: string; sessions: number }>): TrafficSource[] {
  return sources.map((source) => ({
    label: source.source,
    value: formatCount(source.sessions),
  }));
}

const EM_DASH = '—';

function percentDelta(current: number, previous: number): { delta: string; up: boolean } {
  if (previous === 0) return { delta: EM_DASH, up: true };
  const change = ((current - previous) / previous) * 100;
  const sign = change < 0 ? '↓' : '↑';
  return {
    delta: `${sign} ${formatPercent(Math.abs(change))} so với kỳ trước`,
    up: change >= 0,
  };
}

function countDelta(current: number, previous: number): { delta: string; up: boolean } {
  if (previous === 0 && current === 0) return { delta: EM_DASH, up: true };
  const change = current - previous;
  const sign = change < 0 ? '↓' : '↑';
  return {
    delta: `${sign} ${formatCount(Math.abs(change))} so với kỳ trước`,
    up: change >= 0,
  };
}

function pointDelta(current: number, previous: number): { delta: string; up: boolean } {
  if (previous === 0 && current === 0) return { delta: EM_DASH, up: true };
  const change = current - previous;
  const sign = change < 0 ? '↓' : '↑';
  return {
    delta: `${sign} ${formatPercent(Math.abs(change))} điểm`,
    up: change >= 0,
  };
}

export type DashboardData = {
  kpis: Kpi[];
  revenue: RevenueSeries;
  funnel: FunnelStage[];
  topProducts: TopProductRow[];
  traffic: TrafficSource[];
  recentOrders: RecentOrder[];
};

export async function getDashboardData(rangeDays = 7): Promise<DashboardData> {
  const [current, twoWindow, traffic, recentDocs, ctrRows] = await Promise.all([
    getOrderAnalyticsSummary(rangeDays),
    getOrderAnalyticsSummary(rangeDays * 2),
    getTrafficBySource(previousFrom(rangeDays), new Date()),
    listRecentOrders({ status: 'all', limit: 3 }),
    prisma.productCtrDaily.findMany({
      where: { day: { gte: rangeStart(rangeDays), lte: new Date() } },
      select: { productId: true, impressions: true, clicks: true },
    }),
  ]);

  // The immediately preceding window of the same length: the two-day summary
  // minus the current window.
  const previous = {
    revenueVnd: twoWindow.revenueVnd - current.revenueVnd,
    orderCount: twoWindow.orderCount - current.orderCount,
    paidOrderCount: twoWindow.paidOrderCount - current.paidOrderCount,
  };

  const [views, addToCarts, purchases] = await Promise.all([
    prisma.productViewEvent.count({ where: { createdAt: { gte: current.from } } }),
    prisma.addToCartEvent.count({ where: { createdAt: { gte: current.from } } }),
    prisma.purchaseEvent.count({ where: { createdAt: { gte: current.from } } }),
  ]);

  const titles = new Map(current.topProducts.map((product) => [product.productId, product.title]));

  const sessions = traffic.reduce((sum, source) => sum + source.sessions, 0);
  const conversionPct = sessions > 0 ? (current.paidOrderCount / sessions) * 100 : 0;

  const revenueDelta = percentDelta(current.revenueVnd, previous.revenueVnd);
  const ordersDelta = countDelta(current.orderCount, previous.orderCount);
  const conversionDelta = pointDelta(conversionPct, 0);
  const trafficDelta = percentDelta(sessions, 0);

  return {
    kpis: [
      {
        label: `Doanh thu ${rangeDays} ngày`,
        value: formatVndSymbol(current.revenueVnd),
        delta: revenueDelta.delta,
        up: revenueDelta.up,
      },
      {
        label: 'Đơn hàng mới',
        value: formatCount(current.orderCount),
        delta: ordersDelta.delta,
        up: ordersDelta.up,
      },
      {
        label: 'Tỉ lệ chuyển đổi',
        value: formatPercent(conversionPct),
        delta: conversionDelta.delta,
        up: conversionDelta.up,
      },
      {
        label: 'Phiên truy cập',
        value: formatCount(sessions),
        delta: trafficDelta.delta,
        up: trafficDelta.up,
      },
    ],
    revenue: buildRevenueSeries(current.dailyRevenue),
    funnel: buildFunnel(views, addToCarts, purchases),
    topProducts: toTopProductRows(
      ctrRows.map((row) => ({
        productId: row.productId,
        impressions: row.impressions,
        clicks: row.clicks,
      })),
      titles,
    ),
    traffic: toTrafficSources(traffic),
    recentOrders: recentDocs.map(toRecentOrder),
  };
}

function rangeStart(rangeDays: number): Date {
  const from = new Date();
  from.setDate(from.getDate() - rangeDays);
  from.setHours(0, 0, 0, 0);
  return from;
}

function previousFrom(rangeDays: number): Date {
  const from = new Date();
  from.setDate(from.getDate() - rangeDays * 2);
  from.setHours(0, 0, 0, 0);
  return from;
}
