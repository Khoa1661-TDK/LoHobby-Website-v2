// lib/analytics/orders.ts — Payload order/revenue metrics (ShopNex-compatible SoT)
import config from '@payload-config';
import { getPayload } from 'payload';
import type { Order } from '@/src/payload/payload-types';

export type OrderAnalyticsSummary = {
  rangeDays: number;
  from: Date;
  to: Date;
  orderCount: number;
  paidOrderCount: number;
  revenueVnd: number;
  averageOrderVnd: number;
  byPaymentStatus: Array<{ status: string; count: number }>;
  byOrderStatus: Array<{ status: string; count: number }>;
  dailyRevenue: Array<{ date: string; revenueVnd: number; orders: number }>;
  topProducts: Array<{ productId: string; title: string; quantity: number; revenueVnd: number }>;
};

function isPaidOrder(doc: Order): boolean {
  return doc.paymentStatus === 'paid';
}

function isRevenueOrder(doc: Order): boolean {
  return isPaidOrder(doc) && doc.orderStatus !== 'canceled';
}

export async function getOrderAnalyticsSummary(
  rangeDays = 30,
): Promise<OrderAnalyticsSummary> {
  const safeDays = Math.min(365, Math.max(1, Math.floor(rangeDays)));
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - safeDays);
  from.setHours(0, 0, 0, 0);

  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'orders',
    where: {
      createdAt: {
        greater_than_equal: from.toISOString(),
        less_than_equal: to.toISOString(),
      },
    },
    limit: 5000,
    pagination: false,
    depth: 0,
  });

  const orders = found.docs as Order[];

  const byPaymentMap = new Map<string, number>();
  const byOrderMap = new Map<string, number>();
  const dailyMap = new Map<string, { revenueVnd: number; orders: number }>();
  const productMap = new Map<
    string,
    { title: string; quantity: number; revenueVnd: number }
  >();

  let revenueVnd = 0;
  let paidOrderCount = 0;

  for (const order of orders) {
    byPaymentMap.set(
      order.paymentStatus,
      (byPaymentMap.get(order.paymentStatus) ?? 0) + 1,
    );
    byOrderMap.set(order.orderStatus, (byOrderMap.get(order.orderStatus) ?? 0) + 1);

    const dayKey = order.createdAt.slice(0, 10);
    const day = dailyMap.get(dayKey) ?? { revenueVnd: 0, orders: 0 };
    day.orders += 1;

    if (isRevenueOrder(order)) {
      paidOrderCount += 1;
      revenueVnd += order.totalAmount;
      day.revenueVnd += order.totalAmount;
    }
    dailyMap.set(dayKey, day);

    if (!isRevenueOrder(order)) continue;

    const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
    for (const item of lineItems) {
      const lineRevenue = item.unitPrice * item.quantity;
      const existing = productMap.get(item.productId) ?? {
        title: item.productTitle || item.productId,
        quantity: 0,
        revenueVnd: 0,
      };
      existing.quantity += item.quantity;
      existing.revenueVnd += lineRevenue;
      productMap.set(item.productId, existing);
    }
  }

  const byPaymentStatus = [...byPaymentMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const byOrderStatus = [...byOrderMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  const dailyRevenue = [...dailyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, ...value }));

  const topProducts = [...productMap.entries()]
    .map(([productId, stats]) => ({ productId, ...stats }))
    .sort((a, b) => b.revenueVnd - a.revenueVnd)
    .slice(0, 10);

  return {
    rangeDays: safeDays,
    from,
    to,
    orderCount: orders.length,
    paidOrderCount,
    revenueVnd,
    averageOrderVnd: paidOrderCount > 0 ? Math.round(revenueVnd / paidOrderCount) : 0,
    byPaymentStatus,
    byOrderStatus,
    dailyRevenue,
    topProducts,
  };
}
