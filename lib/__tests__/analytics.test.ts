// lib/__tests__/analytics.test.ts — unit tests for analytics business logic
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// classifySource (lib/analytics/classify-source.ts)
// ---------------------------------------------------------------------------
import { classifySource } from '@/lib/analytics/classify-source';
// NOTE: classifySource was extracted from track-client.ts to avoid pulling in
// the 'use client' dependency (cookie-consent) in a Node Vitest environment.

describe('classifySource', () => {
  it('should return utm source when utm_source param is present', () => {
    const result = classifySource({
      search: 'utm_source=promo&utm_medium=email&utm_campaign=summer',
      referrer: 'https://google.com/',
    });
    expect(result).toEqual({
      source: 'promo',
      medium: 'email',
      campaign: 'summer',
    });
  });

  it('should default medium to "referral" when only utm_source is provided', () => {
    const result = classifySource({
      search: 'utm_source=newsletter',
      referrer: '',
    });
    expect(result).toEqual({
      source: 'newsletter',
      medium: 'referral',
      campaign: null,
    });
  });

  it('should classify google referrer as organic with source "google"', () => {
    const result = classifySource({
      search: '',
      referrer: 'https://www.google.com/search?q=best+shoes',
    });
    expect(result.source).toBe('google');
    expect(result.medium).toBe('organic');
  });

  it('should classify bing referrer as organic', () => {
    const result = classifySource({
      search: '',
      referrer: 'https://www.bing.com/search?q=shoes',
    });
    expect(result.source).toBe('bing');
    expect(result.medium).toBe('organic');
  });

  it('should classify facebook referrer as social', () => {
    const result = classifySource({
      search: '',
      referrer: 'https://www.facebook.com/some-post',
    });
    expect(result.source).toBe('facebook');
    expect(result.medium).toBe('social');
  });

  it('should classify zalo referrer as social', () => {
    const result = classifySource({
      search: '',
      referrer: 'https://zalo.me/some-link',
    });
    expect(result.source).toBe('zalo');
    expect(result.medium).toBe('social');
  });

  it('should classify unknown host referrer as referral', () => {
    const result = classifySource({
      search: '',
      referrer: 'https://someblog.example.com/article',
    });
    expect(result.source).toBe('someblog.example.com');
    expect(result.medium).toBe('referral');
  });

  it('should return direct when referrer is empty', () => {
    const result = classifySource({
      search: '',
      referrer: '',
    });
    expect(result).toEqual({
      source: 'direct',
      medium: 'direct',
      campaign: null,
    });
  });

  it('should return direct when referrer is internal (same as currentHost)', () => {
    const result = classifySource({
      search: '',
      referrer: 'https://myshop.com/products/shoe',
      currentHost: 'myshop.com',
    });
    expect(result).toEqual({
      source: 'direct',
      medium: 'direct',
      campaign: null,
    });
  });

  it('should prefer utm over referrer when both are present', () => {
    const result = classifySource({
      search: 'utm_source=promo&utm_medium=banner',
      referrer: 'https://www.google.com/search?q=shoes',
    });
    expect(result.source).toBe('promo');
    expect(result.medium).toBe('banner');
  });

  it('should handle URLSearchParams input', () => {
    const result = classifySource({
      search: new URLSearchParams('utm_source=twitter&utm_campaign=launch'),
      referrer: '',
    });
    expect(result.source).toBe('twitter');
    expect(result.campaign).toBe('launch');
  });

  it('should lowercase utm values', () => {
    const result = classifySource({
      search: 'utm_source=Facebook&utm_medium=Social',
      referrer: '',
    });
    expect(result.source).toBe('facebook');
    expect(result.medium).toBe('social');
  });
});

// ---------------------------------------------------------------------------
// aggregateSales / topSellers / bottomSellers (lib/analytics/product-metrics.ts)
// ---------------------------------------------------------------------------
import {
  aggregateSales,
  topSellers,
  bottomSellers,
  computeViewToBuy,
  aggregateAttention,
  type ProductSales,
  type ProductAttention,
} from '@/lib/analytics/product-metrics';
import type { Order } from '@/src/payload/payload-types';

function sampleOrder(
  overrides?: Record<string, unknown>,
): Order {
  return {
    id: 'order-1',
    lineItems: [
      {
        productId: 'prod-a',
        productTitle: 'Product A',
        productHandle: 'product-a',
        quantity: 2,
        unitPrice: 50000,
      },
      {
        productId: 'prod-b',
        productTitle: 'Product B',
        productHandle: 'product-b',
        quantity: 1,
        unitPrice: 150000,
      },
    ],
    totalAmount: 250000,
    paymentStatus: 'paid',
    orderStatus: 'delivered',
    ...overrides,
  } as unknown as Order; // partial mock — only used fields matter
}

describe('aggregateSales', () => {
  it('should aggregate units and revenue per product from line items', () => {
    const result = aggregateSales([sampleOrder()]);
    const a = result.find((r) => r.productId === 'prod-a')!;
    const b = result.find((r) => r.productId === 'prod-b')!;
    expect(a.units).toBe(2);
    expect(a.revenueVnd).toBe(100000);
    expect(b.units).toBe(1);
    expect(b.revenueVnd).toBe(150000);
  });

  it('should skip orders without lineItems', () => {
    const result = aggregateSales([
      { id: 'empty', paymentStatus: 'paid' } as unknown as Order,
    ]);
    expect(result).toHaveLength(0);
  });

  it('should skip line items without productId', () => {
    const order = sampleOrder();
    order.lineItems = [{ quantity: 1, unitPrice: 100 }] as unknown as Order['lineItems'];
    const result = aggregateSales([order]);
    expect(result).toHaveLength(0);
  });

  it('should sum quantities and revenue across multiple orders', () => {
    const o1 = sampleOrder();
    const o2 = sampleOrder({ id: 'order-2', totalAmount: 100000 });
    o2.lineItems = [
      { productId: 'prod-a', productTitle: 'Product A', productHandle: 'product-a', quantity: 3, unitPrice: 50000 },
    ] as unknown as Order['lineItems'];
    const result = aggregateSales([o1, o2]);
    expect(result.find((r) => r.productId === 'prod-a')!.units).toBe(5);
    expect(result.find((r) => r.productId === 'prod-a')!.revenueVnd).toBe(250000);
  });
});

describe('topSellers', () => {
  it('should return top N products sorted by units descending', () => {
    const sales: ProductSales[] = [
      { productId: 'a', productHandle: 'a', productTitle: 'A', units: 1, revenueVnd: 100 },
      { productId: 'b', productHandle: 'b', productTitle: 'B', units: 5, revenueVnd: 500 },
      { productId: 'c', productHandle: 'c', productTitle: 'C', units: 3, revenueVnd: 300 },
    ];
    expect(topSellers(sales, 2)).toEqual([
      sales[1], sales[2],
    ]);
  });
});

describe('bottomSellers', () => {
  it('should return bottom N products sorted by units ascending (excluding zero)', () => {
    const sales = [
      { productId: 'a', productHandle: 'a', productTitle: 'A', units: 0, revenueVnd: 0 } as ProductSales,
      { productId: 'b', productHandle: 'b', productTitle: 'B', units: 1, revenueVnd: 100 } as ProductSales,
      { productId: 'c', productHandle: 'c', productTitle: 'C', units: 5, revenueVnd: 500 } as ProductSales,
    ];
    expect(bottomSellers(sales, 3)).toEqual([sales[1], sales[2]]);
  });

  it('should return empty array when all units are zero', () => {
    const sales = [
      { productId: 'a', productHandle: 'a', productTitle: 'A', units: 0, revenueVnd: 0 } as ProductSales,
    ];
    expect(bottomSellers(sales, 5)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeViewToBuy
// ---------------------------------------------------------------------------
describe('computeViewToBuy', () => {
  it('should calculate conversionPct as (units / views) * 100', () => {
    const sales: ProductSales[] = [
      { productId: 'p1', productHandle: 'p1', productTitle: 'P1', units: 5, revenueVnd: 100000 },
    ];
    const attention: ProductAttention[] = [
      { productId: 'p1', productHandle: 'p1', productTitle: 'P1', views: 100, avgDwellMs: 30000 },
    ];
    const result = computeViewToBuy(sales, attention);
    expect(result[0]!.conversionPct).toBe(5.0);
  });

  it('should return 0 conversionPct when views is 0', () => {
    const sales: ProductSales[] = [
      { productId: 'p1', productHandle: 'p1', productTitle: 'P1', units: 5, revenueVnd: 100000 },
    ];
    const result = computeViewToBuy(sales, []);
    expect(result[0]!.conversionPct).toBe(0);
  });

  it('should flag highAttentionLowConversion when views >= minViews and conversion < maxConvPct', () => {
    const sales: ProductSales[] = [
      { productId: 'p1', productHandle: 'p1', productTitle: 'P1', units: 1, revenueVnd: 10000 },
    ];
    const attention: ProductAttention[] = [
      { productId: 'p1', productHandle: 'p1', productTitle: 'P1', views: 20, avgDwellMs: 50000 },
    ];
    // conversionPct = 1/20 * 100 = 5%, with default maxConvPct=2 → NOT flagged
    const result1 = computeViewToBuy(sales, attention);
    expect(result1[0]!.highAttentionLowConversion).toBe(false);

    // 1 view out of 50 → 2% conversion → NOT less than 2
    const attention2: ProductAttention = { productId: 'p1', productHandle: 'p1', productTitle: 'P1', views: 50, avgDwellMs: 50000 };
    const result2 = computeViewToBuy(sales, [attention2]);
    expect(result2[0]!.highAttentionLowConversion).toBe(false);

    // 1 view out of 100 → 1% → FLAGGED
    const attention3: ProductAttention = { productId: 'p1', productHandle: 'p1', productTitle: 'P1', views: 100, avgDwellMs: 50000 };
    const result3 = computeViewToBuy(sales, [attention3]);
    expect(result3[0]!.highAttentionLowConversion).toBe(true);
  });

  it('should include attention-only products (no sales) with conversionPct = 0', () => {
    const attention: ProductAttention[] = [
      { productId: 'p1', productHandle: 'p1', productTitle: 'P1', views: 30, avgDwellMs: 10000 },
    ];
    const result = computeViewToBuy([], attention);
    expect(result).toHaveLength(1);
    expect(result[0]!.units).toBe(0);
    expect(result[0]!.conversionPct).toBe(0);
  });

  it('should include avgDwellMs from attention data', () => {
    const sales: ProductSales[] = [
      { productId: 'p1', productHandle: 'p1', productTitle: 'P1', units: 1, revenueVnd: 50000 },
    ];
    const attention: ProductAttention[] = [
      { productId: 'p1', productHandle: 'p1', productTitle: 'P1', views: 10, avgDwellMs: 45000 },
    ];
    const result = computeViewToBuy(sales, attention);
    expect(result[0]!.avgDwellMs).toBe(45000);
  });
});

// ---------------------------------------------------------------------------
// aggregateAttention
// ---------------------------------------------------------------------------
describe('aggregateAttention', () => {
  it('should count views and compute average dwell per product', () => {
    const events = [
      { productId: 'p1', productHandle: 'p1', dwellMs: 5000 },
      { productId: 'p1', productHandle: 'p1', dwellMs: 7000 },
      { productId: 'p2', productHandle: 'p2', dwellMs: 10000 },
    ];
    const result = aggregateAttention(events);
    const p1 = result.find((r) => r.productId === 'p1')!;
    expect(p1.views).toBe(2);
    expect(p1.avgDwellMs).toBe(6000);
    const p2 = result.find((r) => r.productId === 'p2')!;
    expect(p2.views).toBe(1);
    expect(p2.avgDwellMs).toBe(10000);
  });

  it('should skip events without productId', () => {
    const events = [
      { productId: '', dwellMs: 5000 },
    ] as unknown as Array<{ productId: string; productHandle?: string; dwellMs: number }>;
    expect(aggregateAttention(events)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sanitizeDwell + boundedString (lib/analytics/track-server.ts)
// ---------------------------------------------------------------------------
import { sanitizeDwell, boundedString } from '@/lib/analytics/track-server';

describe('sanitizeDwell', () => {
  it('should return 0 for negative values', () => {
    expect(sanitizeDwell(-1)).toBe(0);
  });

  it('should return 0 for NaN', () => {
    expect(sanitizeDwell(NaN)).toBe(0);
  });

  it('should return 0 for Infinity', () => {
    expect(sanitizeDwell(Infinity)).toBe(0);
  });

  it('should round dwell to nearest integer', () => {
    expect(sanitizeDwell(1234.56)).toBe(1235);
  });

  it('should cap dwell to MAX_DWELL_MS', () => {
    expect(sanitizeDwell(60 * 60 * 1000)).toBe(30 * 60 * 1000);
  });

  it('should return valid dwell as-is', () => {
    expect(sanitizeDwell(10000)).toBe(10000);
  });
});

describe('boundedString', () => {
  it('should return null for empty string', () => {
    expect(boundedString('', 100)).toBeNull();
  });

  it('should return null for whitespace string', () => {
    expect(boundedString('   ', 100)).toBeNull();
  });

  it('should return null for non-string input', () => {
    expect(boundedString(123, 100)).toBeNull();
    expect(boundedString(null, 100)).toBeNull();
    expect(boundedString(undefined, 100)).toBeNull();
  });

  it('should truncate strings longer than max', () => {
    expect(boundedString('hello world', 5)).toBe('hello');
  });

  it('should return short strings as-is', () => {
    expect(boundedString('hello', 100)).toBe('hello');
  });

  it('should trim whitespace before checking emptiness', () => {
    expect(boundedString('   hi   ', 100)).toBe('hi');
  });
});