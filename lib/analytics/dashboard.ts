// lib/analytics/dashboard.ts — monthly order metrics for the admin dashboard (VND)
import config from '@payload-config';
import { getPayload } from 'payload';
import type { Order } from '@/src/payload/payload-types';

export type MonthlyOrderMetrics = {
  totalOrders: number;
  paidOrders: number;
  revenueVnd: number;
  avgOrderVnd: number;
};

export type DailySalesPoint = {
  date: string;
  orders: number;
  revenueVnd: number;
};

export function isRevenueOrder(order: Order): boolean {
  return order.paymentStatus === 'paid' && order.orderStatus !== 'canceled';
}

export function getMonthRange(monthOffset: number, now = new Date()): { start: Date; end: Date } {
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export async function fetchOrdersInRange(start: Date, end: Date): Promise<Order[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: 'orders',
    pagination: false,
    sort: 'createdAt',
    where: {
      createdAt: {
        greater_than: start.toISOString(),
        less_than: end.toISOString(),
      },
    },
    limit: 5000,
  });
  return result.docs as Order[];
}

export function computeMonthlyMetrics(orders: Order[]): MonthlyOrderMetrics {
  const revenueOrders = orders.filter(isRevenueOrder);
  const revenueVnd = revenueOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const paidOrders = revenueOrders.length;

  return {
    totalOrders: orders.length,
    paidOrders,
    revenueVnd,
    avgOrderVnd: paidOrders > 0 ? Math.round(revenueVnd / paidOrders) : 0,
  };
}

export function buildDailySalesChart(orders: Order[]): DailySalesPoint[] {
  const dailyMap = new Map<string, DailySalesPoint>();

  for (const order of orders.filter(isRevenueOrder)) {
    const date = new Date(order.createdAt).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
    const existing = dailyMap.get(date) ?? { date, orders: 0, revenueVnd: 0 };
    existing.orders += 1;
    existing.revenueVnd += order.totalAmount;
    dailyMap.set(date, existing);
  }

  return [...dailyMap.values()].sort((a, b) => {
    const [dayA = 0, monthA = 0] = a.date.split('/').map(Number);
    const [dayB = 0, monthB = 0] = b.date.split('/').map(Number);
    if (monthA !== monthB) return monthA - monthB;
    return dayA - dayB;
  });
}

export function formatPercentChange(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? '+100%' : '0%';
  }
  const change = ((current - previous) / previous) * 100;
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}
