// lib/__tests__/auto-sale-viewers.test.ts
import { describe, it, expect } from 'vitest';
import { countUniqueViewers } from '@/lib/analytics/product-metrics';

describe('countUniqueViewers', () => {
  it('should count one viewer per distinct session regardless of repeat views', () => {
    const rows = countUniqueViewers([
      { productId: 'p1', sessionId: 's1', _count: 40 },
      { productId: 'p1', sessionId: 's2', _count: 1 },
    ]);
    expect(rows).toEqual([{ productId: 'p1', viewers: 2, rawViews: 41 }]);
  });

  it('should rank a product with more unique viewers above one with more raw views', () => {
    const rows = countUniqueViewers([
      { productId: 'refresher', sessionId: 's1', _count: 99 },
      { productId: 'popular', sessionId: 's2', _count: 1 },
      { productId: 'popular', sessionId: 's3', _count: 1 },
    ]);
    expect(rows.map((r) => r.productId)).toEqual(['popular', 'refresher']);
  });

  it('should break viewer ties by raw views, then by productId', () => {
    const rows = countUniqueViewers([
      { productId: 'b', sessionId: 's1', _count: 1 },
      { productId: 'a', sessionId: 's2', _count: 1 },
      { productId: 'c', sessionId: 's3', _count: 5 },
    ]);
    expect(rows.map((r) => r.productId)).toEqual(['c', 'a', 'b']);
  });

  it('should ignore rows with an empty productId', () => {
    expect(countUniqueViewers([{ productId: '', sessionId: 's1', _count: 3 }])).toEqual([]);
  });

  it('should return an empty array for no events', () => {
    expect(countUniqueViewers([])).toEqual([]);
  });
});
