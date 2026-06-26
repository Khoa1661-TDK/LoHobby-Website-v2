// lib/__tests__/analytics-cart.test.ts
import { describe, it, expect } from 'vitest';
import {
  computeCartAbandonment,
  computeAtcFunnel,
  type AtcSession,
  type Conversions,
} from '@/lib/analytics/cart-metrics';

const conversions = (anonIds: string[], customerIds: string[] = []): Conversions => ({
  anonIds: new Set(anonIds),
  customerIds: new Set(customerIds),
});

const session = (
  sessionId: string,
  anonId: string | null,
  customerId: string | null = null,
): AtcSession => ({ sessionId, anonId, customerId });

describe('computeCartAbandonment', () => {
  it('should count abandoned vs completed across all sessions', () => {
    const sessions = [
      session('s1', 'a1'),
      session('s2', 'a2'),
      session('s3', 'a3'),
    ];
    const r = computeCartAbandonment(sessions, conversions(['a3']));
    expect(r).toEqual({ abandoned: 2, completed: 1, abandonmentPct: 66.7 });
  });

  it('should count a guest cart as completed when its anonId checked out', () => {
    // s1 is a guest (no customerId) but bought under the same anonId.
    const sessions = [session('s1', 'guest-a1', null), session('s2', 'a2', null)];
    const r = computeCartAbandonment(sessions, conversions(['guest-a1']));
    expect(r).toEqual({ abandoned: 1, completed: 1, abandonmentPct: 50 });
  });

  it('should match a logged-in conversion by customerId across devices', () => {
    // Added to cart on one device (anonId a1), bought on another (anonId b1)
    // — only the customerId ties them together.
    const sessions = [session('s1', 'a1', 'c1')];
    const r = computeCartAbandonment(sessions, conversions(['b1'], ['c1']));
    expect(r).toEqual({ abandoned: 0, completed: 1, abandonmentPct: 0 });
  });

  it('should return zero rate when there are no sessions', () => {
    expect(computeCartAbandonment([], conversions([]))).toEqual({
      abandoned: 0,
      completed: 0,
      abandonmentPct: 0,
    });
  });

  it('should report 100% when no session can be matched to a checkout', () => {
    const r = computeCartAbandonment([session('s1', 'a1')], conversions([]));
    expect(r.abandonmentPct).toBe(100);
  });
});

describe('computeAtcFunnel', () => {
  it('should compute add-to-cart sessions and converted share (guests included)', () => {
    const sessions = [
      session('s1', 'a1', 'c1'),
      session('s2', 'a2', 'c2'),
      session('s3', 'guest-a3', null),
    ];
    // c1 converted (logged-in), guest-a3 converted (guest) → 2 of 3.
    const r = computeAtcFunnel(sessions, conversions(['guest-a3'], ['c1']));
    expect(r).toEqual({ atcSessions: 3, convertedSessions: 2, conversionPct: 66.7 });
  });

  it('should return zeros when no sessions added to cart', () => {
    expect(computeAtcFunnel([], conversions([]))).toEqual({
      atcSessions: 0,
      convertedSessions: 0,
      conversionPct: 0,
    });
  });
});
