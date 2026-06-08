// lib/__tests__/analytics-ctr.test.ts
import { describe, it, expect } from 'vitest';
import { computeCtr } from '@/lib/analytics/product-metrics';

describe('computeCtr', () => {
  it('should compute ctrPct = clicks / impressions', () => {
    const rows = computeCtr([{ productId: 'p1', impressions: 200, clicks: 10 }]);
    expect(rows[0]).toEqual({ productId: 'p1', impressions: 200, clicks: 10, ctrPct: 5 });
  });

  it('should sort by impressions descending', () => {
    const rows = computeCtr([
      { productId: 'a', impressions: 10, clicks: 1 },
      { productId: 'b', impressions: 100, clicks: 1 },
    ]);
    expect(rows[0]?.productId).toBe('b');
  });

  it('should drop products below the min-impression threshold', () => {
    const rows = computeCtr(
      [
        { productId: 'a', impressions: 5, clicks: 5 },
        { productId: 'b', impressions: 100, clicks: 1 },
      ],
      { minImpressions: 20 },
    );
    expect(rows.map((r) => r.productId)).toEqual(['b']);
  });

  it('should report 0% ctr when impressions are zero (filtered out by default threshold)', () => {
    const rows = computeCtr([{ productId: 'a', impressions: 0, clicks: 0 }], { minImpressions: 0 });
    expect(rows[0]?.ctrPct).toBe(0);
  });
});