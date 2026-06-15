// lib/__tests__/analytics-discounted.test.ts
import { describe, it, expect } from 'vitest';
import { joinDiscountedItems } from '@/lib/analytics/product-metrics';
import type { ProductSales } from '@/lib/analytics/product-metrics';

const onSale = [
  { productId: 'p1', slug: 'p1', title: 'Áo thun', salePercent: 20 },
  { productId: 'p2', slug: 'p2', title: 'Quần jean', salePercent: 50 },
];

const sales: ProductSales[] = [
  { productId: 'p1', productHandle: 'p1', productTitle: 'Áo thun', units: 3, revenueVnd: 300000 },
  { productId: 'p9', productHandle: 'p9', productTitle: 'Khác', units: 99, revenueVnd: 999 },
];

describe('joinDiscountedItems', () => {
  it('should pair on-sale products with their sales in the window', () => {
    const rows = joinDiscountedItems(onSale, sales);
    const p1 = rows.find((r) => r.productId === 'p1');
    expect(p1).toEqual({ productId: 'p1', slug: 'p1', title: 'Áo thun', salePercent: 20, units: 3, revenueVnd: 300000 });
  });

  it('should include on-sale products with zero sales so dead promos are visible', () => {
    const rows = joinDiscountedItems(onSale, sales);
    const p2 = rows.find((r) => r.productId === 'p2');
    expect(p2).toEqual({ productId: 'p2', slug: 'p2', title: 'Quần jean', salePercent: 50, units: 0, revenueVnd: 0 });
  });

  it('should not include non-sale products even if they sold', () => {
    const rows = joinDiscountedItems(onSale, sales);
    expect(rows.find((r) => r.productId === 'p9')).toBeUndefined();
  });

  it('should sort by revenue descending', () => {
    const rows = joinDiscountedItems(onSale, sales);
    expect(rows[0]?.productId).toBe('p1');
  });

  it('should return empty array when nothing is on sale', () => {
    expect(joinDiscountedItems([], sales)).toEqual([]);
  });
});