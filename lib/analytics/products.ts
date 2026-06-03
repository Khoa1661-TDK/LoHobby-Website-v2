// lib/analytics/products.ts — DATA layer: product performance for the admin dashboard.
//
// Orchestrates fetching orders and view events, then delegates to the pure
// aggregation functions in product-metrics.ts.
import { prisma } from '@/lib/prisma';
import {
  fetchOrdersInRange,
  isRevenueOrder,
} from '@/lib/analytics/dashboard';
import {
  aggregateSales,
  topSellers,
  bottomSellers,
  aggregateAttention,
  computeViewToBuy,
  type ProductSales,
  type ViewToBuyRow,
} from '@/lib/analytics/product-metrics';

const PERFORMANCE_LIMIT = 8;

export type ProductPerformanceResult = {
  topSellers: ProductSales[];
  bottomSellers: ProductSales[];
  viewToBuy: ViewToBuyRow[];
};

export async function getProductPerformance(
  start: Date,
  end: Date,
): Promise<ProductPerformanceResult> {
  const [orders, viewEvents] = await Promise.all([
    fetchOrdersInRange(start, end),
    prisma.productViewEvent.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: {
        productId: true,
        productHandle: true,
        dwellMs: true,
      },
    }),
  ]);

  const revenueOrders = orders.filter(isRevenueOrder);
  const sales = aggregateSales(revenueOrders);

  return {
    topSellers: topSellers(sales, PERFORMANCE_LIMIT),
    bottomSellers: bottomSellers(sales, PERFORMANCE_LIMIT),
    viewToBuy: computeViewToBuy(sales, aggregateAttention(viewEvents)),
  };
}