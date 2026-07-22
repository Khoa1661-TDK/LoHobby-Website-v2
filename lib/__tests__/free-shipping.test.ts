import { describe, expect, it } from 'vitest';
import { resolveFreeShippingProgress } from '@/lib/free-shipping';

describe('resolveFreeShippingProgress', () => {
  it('should return null when the threshold is zero (feature disabled)', () => {
    expect(resolveFreeShippingProgress(500_000, 0)).toBeNull();
  });

  it('should return null when the threshold is negative', () => {
    expect(resolveFreeShippingProgress(500_000, -1)).toBeNull();
  });

  it('should return null when the threshold is not a finite number', () => {
    expect(resolveFreeShippingProgress(500_000, Number.NaN)).toBeNull();
  });

  it('should report the remaining amount when the subtotal is below the threshold', () => {
    expect(resolveFreeShippingProgress(300_000, 500_000)).toEqual({
      qualified: false,
      remainingVnd: 200_000,
      percent: 60,
    });
  });

  it('should qualify when the subtotal exactly equals the threshold', () => {
    expect(resolveFreeShippingProgress(500_000, 500_000)).toEqual({
      qualified: true,
      remainingVnd: 0,
      percent: 100,
    });
  });

  it('should qualify and clamp the percent when the subtotal exceeds the threshold', () => {
    expect(resolveFreeShippingProgress(900_000, 500_000)).toEqual({
      qualified: true,
      remainingVnd: 0,
      percent: 100,
    });
  });

  it('should treat an empty cart as zero progress rather than qualifying', () => {
    expect(resolveFreeShippingProgress(0, 500_000)).toEqual({
      qualified: false,
      remainingVnd: 500_000,
      percent: 0,
    });
  });

  it('should treat a non-finite subtotal as zero', () => {
    expect(resolveFreeShippingProgress(Number.NaN, 500_000)).toEqual({
      qualified: false,
      remainingVnd: 500_000,
      percent: 0,
    });
  });

  it('should round the percent to an integer', () => {
    // Optional chaining is required: the return type is nullable, and tsc
    // --noEmit is part of the commit gate.
    expect(resolveFreeShippingProgress(1, 3)?.percent).toBe(33);
  });
});
