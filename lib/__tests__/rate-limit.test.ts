import { describe, expect, it } from 'vitest';
import { checkRateLimit, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';

describe('rate-limit', () => {
  it('allows requests under the limit', () => {
    const key = `test-${Date.now()}-allow`;
    const config = { limit: 3, windowMs: 60_000 };
    expect(checkRateLimit(key, config).allowed).toBe(true);
    expect(checkRateLimit(key, config).allowed).toBe(true);
    expect(checkRateLimit(key, config).allowed).toBe(true);
  });

  it('blocks requests over the limit', () => {
    const key = `test-${Date.now()}-block`;
    const config = { limit: 2, windowMs: 60_000 };
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    expect(checkRateLimit(key, config).allowed).toBe(false);
  });

  it('exposes checkout preset', () => {
    expect(RATE_LIMIT_PRESETS.checkout.limit).toBeGreaterThan(0);
  });
});
