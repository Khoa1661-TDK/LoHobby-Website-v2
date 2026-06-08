// lib/analytics/product-metrics.ts — PURE aggregation: no DB imports, fully testable.
//
// All functions are synchronous and operate only on their arguments. The only
// external import is a type-only import of Order (erased at runtime).
import type { Order } from '@/src/payload/payload-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductSales = {
  productId: string;
  productHandle: string;
  productTitle: string;
  units: number;
  revenueVnd: number;
};

export type ProductAttention = {
  productId: string;
  productHandle: string;
  productTitle: string;
  views: number;
  avgDwellMs: number;
};

export type ViewToBuyRow = {
  productId: string;
  productHandle: string;
  productTitle: string;
  views: number;
  units: number;
  avgDwellMs: number;
  conversionPct: number;
  highAttentionLowConversion: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// ---------------------------------------------------------------------------
// Sales aggregation
// ---------------------------------------------------------------------------

/**
 * Aggregate line items from revenue orders into per-product sales totals.
 *
 * The caller is expected to pass only revenue orders (paid, not canceled).
 * Each line item's `quantity` is summed into `units`, and
 * `quantity * unitPrice` into `revenueVnd`, keyed by `productId`.
 */
export function aggregateSales(orders: Order[]): ProductSales[] {
  const map = new Map<string, ProductSales>();

  for (const order of orders) {
    if (!order.lineItems) continue;
    for (const item of order.lineItems) {
      const { productId, productTitle, productHandle, quantity, unitPrice } = item;
      if (!productId) continue;

      const existing = map.get(productId) ?? {
        productId,
        productHandle: productHandle ?? '',
        productTitle: productTitle ?? '',
        units: 0,
        revenueVnd: 0,
      };
      existing.units += quantity;
      existing.revenueVnd += quantity * unitPrice;
      // Pick up the most descriptive title/handle we encounter
      if (productHandle) existing.productHandle = productHandle;
      if (productTitle) existing.productTitle = productTitle;
      map.set(productId, existing);
    }
  }

  return [...map.values()];
}

/** Top N sellers by units sold (descending). */
export function topSellers(sales: ProductSales[], limit: number): ProductSales[] {
  return [...sales].sort((a, b) => b.units - a.units).slice(0, limit);
}

/** Bottom N sellers by units sold (ascending), excluding zero-unit items. */
export function bottomSellers(sales: ProductSales[], limit: number): ProductSales[] {
  return [...sales]
    .filter((s) => s.units > 0)
    .sort((a, b) => a.units - b.units)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Attention aggregation (views + dwell)
// ---------------------------------------------------------------------------

/**
 * Aggregate raw view events into per-product attention metrics.
 *
 * Returns one entry per `productId` with a view count and the integer average
 * dwell time across all events for that product.
 */
export function aggregateAttention(
  events: { productId: string; productHandle?: string; dwellMs: number }[],
): ProductAttention[] {
  const viewMap = new Map<string, { count: number; totalDwell: number; productHandle: string }>();

  for (const event of events) {
    const { productId, dwellMs } = event;
    if (!productId) continue;
    const entry = viewMap.get(productId) ?? { count: 0, totalDwell: 0, productHandle: '' };
    entry.count += 1;
    entry.totalDwell += dwellMs;
    if (event.productHandle) entry.productHandle = event.productHandle;
    viewMap.set(productId, entry);
  }

  return [...viewMap.entries()].map(([productId, { count, totalDwell, productHandle }]) => ({
    productId,
    productHandle,
    productTitle: '',
    views: count,
    avgDwellMs: count > 0 ? Math.round(totalDwell / count) : 0,
  }));
}

// ---------------------------------------------------------------------------
// View-to-buy conversion
// ---------------------------------------------------------------------------

/**
 * Join sales and attention by productId to produce a view-to-buy conversion
 * table sorted by views descending.
 *
 * Flags products whose view count exceeds `minViews` (default 20) yet whose
 * conversion rate is below `maxConvPct` (default 2%) as
 * `highAttentionLowConversion` — a signal of poor conversion despite traffic.
 */
export function computeViewToBuy(
  sales: ProductSales[],
  attention: ProductAttention[],
  opts?: { minViews?: number; maxConvPct?: number },
): ViewToBuyRow[] {
  const minViews = opts?.minViews ?? 20;
  const maxConvPct = opts?.maxConvPct ?? 2;
  const attentionMap = new Map(attention.map((a) => [a.productId, a]));

  const salesMap = new Map(sales.map((s) => [s.productId, s]));
  const rows: ViewToBuyRow[] = [];

  for (const item of sales) {
    const attn = attentionMap.get(item.productId);
    const views = attn?.views ?? 0;
    const units = item.units;
    const conversionPct = views > 0 ? round1((units / views) * 100) : 0;

    rows.push({
      productId: item.productId,
      productHandle: item.productHandle,
      productTitle: item.productTitle,
      views,
      units,
      avgDwellMs: attn?.avgDwellMs ?? 0,
      conversionPct,
      highAttentionLowConversion: views >= minViews && conversionPct < maxConvPct,
    });
  }

  // Also include products with views but no sales (zero conversion)
  for (const attn of attention) {
    if (!salesMap.has(attn.productId)) {
      rows.push({
        productId: attn.productId,
        productHandle: attn.productHandle,
        productTitle: attn.productTitle,
        views: attn.views,
        units: 0,
        avgDwellMs: attn.avgDwellMs,
        conversionPct: 0,
        highAttentionLowConversion: attn.views >= minViews,
      });
    }
  }

  return rows.sort((a, b) => b.views - a.views);
}

// ---------------------------------------------------------------------------
// Discounted-item report
// ---------------------------------------------------------------------------

export type OnSaleProduct = {
  productId: string;
  slug: string;
  title: string;
  salePercent: number;
};

export type DiscountedItemRow = {
  productId: string;
  slug: string;
  title: string;
  salePercent: number;
  units: number;
  revenueVnd: number;
};

/**
 * Pair on-sale products with their sales in the window. On-sale products with
 * no sales are kept (units/revenue 0) so underperforming promotions are visible.
 * Sorted by revenue descending.
 */
export function joinDiscountedItems(
  onSale: OnSaleProduct[],
  sales: ProductSales[],
): DiscountedItemRow[] {
  const salesMap = new Map(sales.map((s) => [s.productId, s]));
  return onSale
    .map((p) => {
      const s = salesMap.get(p.productId);
      return {
        productId: p.productId,
        slug: p.slug,
        title: p.title,
        salePercent: p.salePercent,
        units: s?.units ?? 0,
        revenueVnd: s?.revenueVnd ?? 0,
      };
    })
    .sort((a, b) => b.revenueVnd - a.revenueVnd);
}