import { afterEach, describe, expect, it, vi } from 'vitest';
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

// The auth preset guards the credential endpoints. middleware.ts applies it to
// `/api/auth/*` (login, forgot-password, reset-password) and `/api/register`,
// so these tests pin the limiter behavior those routes rely on.
describe('rate-limit: auth-route coverage', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes a bounded auth preset for credential endpoints', () => {
    expect(RATE_LIMIT_PRESETS.auth.limit).toBeGreaterThan(0);
    expect(RATE_LIMIT_PRESETS.auth.windowMs).toBeGreaterThan(0);
  });

  it('blocks an IP after it exhausts the auth budget within the window', () => {
    const key = `auth:198.51.100.7-${Date.now()}`;
    const { auth } = RATE_LIMIT_PRESETS;
    for (let i = 0; i < auth.limit; i += 1) {
      expect(checkRateLimit(key, auth).allowed).toBe(true);
    }
    // The next request over the budget is rejected.
    const blocked = checkRateLimit(key, auth);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('isolates buckets per client IP so one IP cannot exhaust another', () => {
    const config = { limit: 1, windowMs: 60_000 };
    const ipA = `auth:10.0.0.1-${Date.now()}`;
    const ipB = `auth:10.0.0.2-${Date.now()}`;
    expect(checkRateLimit(ipA, config).allowed).toBe(true);
    expect(checkRateLimit(ipA, config).allowed).toBe(false); // A is now blocked
    expect(checkRateLimit(ipB, config).allowed).toBe(true); // B is unaffected
  });

  it('allows requests again after the window elapses', () => {
    vi.useFakeTimers();
    const key = `auth:203.0.113.9-${Date.now()}`;
    const config = { limit: 2, windowMs: 60_000 };
    checkRateLimit(key, config);
    checkRateLimit(key, config);
    expect(checkRateLimit(key, config).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit(key, config).allowed).toBe(true);
  });
});
