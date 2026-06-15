// lib/__tests__/analytics-cart.test.ts
import { describe, it, expect } from 'vitest';
import { computeCartAbandonment, computeAtcFunnel } from '@/lib/analytics/cart-metrics';

describe('computeCartAbandonment', () => {
  it('should count abandoned vs completed and compute the rate', () => {
    const r = computeCartAbandonment([
      { completed: false, itemCount: 2 },
      { completed: false, itemCount: 1 },
      { completed: true, itemCount: 3 },
    ]);
    expect(r).toEqual({ abandoned: 2, completed: 1, abandonmentPct: 66.7 });
  });

  it('should ignore empty carts (no items)', () => {
    const r = computeCartAbandonment([
      { completed: false, itemCount: 0 },
      { completed: true, itemCount: 1 },
    ]);
    expect(r).toEqual({ abandoned: 0, completed: 1, abandonmentPct: 0 });
  });

  it('should return zero rate when there are no carts', () => {
    expect(computeCartAbandonment([])).toEqual({ abandoned: 0, completed: 0, abandonmentPct: 0 });
  });

  it('should report 100% when every cart with items is abandoned', () => {
    const r = computeCartAbandonment([{ completed: false, itemCount: 1 }]);
    expect(r.abandonmentPct).toBe(100);
  });
});

describe('computeAtcFunnel', () => {
  it('should compute add-to-cart sessions and converted share', () => {
    const sessions = [
      { sessionId: 's1', customerId: 'c1' },
      { sessionId: 's2', customerId: 'c2' },
      { sessionId: 's3', customerId: null },
    ];
    const converted = new Set(['c1']);
    expect(computeAtcFunnel(sessions, converted)).toEqual({
      atcSessions: 3,
      convertedSessions: 1,
      conversionPct: 33.3,
    });
  });

  it('should return zeros when no sessions added to cart', () => {
    expect(computeAtcFunnel([], new Set())).toEqual({
      atcSessions: 0,
      convertedSessions: 0,
      conversionPct: 0,
    });
  });
});