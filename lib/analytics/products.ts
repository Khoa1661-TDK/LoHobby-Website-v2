// lib/analytics/products.ts — DATA layer: product performance for the admin dashboard.
//
// Orchestrates fetching orders and view events, then delegates to the pure
// aggregation functions in product-metrics.ts.
import config from '@payload-config';
import { getPayload } from 'payload';
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
  joinDiscountedItems,
  type ProductSales,
  type ViewToBuyRow,
  type DiscountedItemRow,
  type OnSaleProduct,
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

export async function getDiscountedItemPerformance(
  start: Date,
  end: Date,
): Promise<DiscountedItemRow[]> {
  const payload = await getPayload({ config });
  const [onSaleResult, orders] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { onSale: { equals: true } },
      pagination: false,
      limit: 1000,
      select: { title: true, slug: true, salePercent: true },
    }),
    fetchOrdersInRange(start, end),
  ]);

  const onSale: OnSaleProduct[] = onSaleResult.docs.map((d) => ({
    productId: String(d.id),
    slug: (d as { slug?: string }).slug ?? '',
    title: (d as { title?: string }).title ?? '',
    salePercent: (d as { salePercent?: number }).salePercent ?? 0,
  }));

  const sales = aggregateSales(orders.filter(isRevenueOrder));
  return joinDiscountedItems(onSale, sales);
}