import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDemoPaymentAllowed } from '@/lib/feature-flags';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isDemoPaymentAllowed', () => {
  it('should allow demo payments outside production by default', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEMO_PAYMENTS', '');
    expect(isDemoPaymentAllowed()).toBe(true);
  });

  it('should block demo payments in production by default', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_DEMO_PAYMENTS', '');
    expect(isDemoPaymentAllowed()).toBe(false);
  });

  it('should allow demo payments in production when explicitly enabled', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_DEMO_PAYMENTS', 'true');
    expect(isDemoPaymentAllowed()).toBe(true);
  });
});
