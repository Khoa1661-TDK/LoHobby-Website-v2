import { afterEach, describe, expect, it, vi } from 'vitest';
import { isPaymentMethodOfferable } from '@/lib/payment-methods';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isPaymentMethodOfferable', () => {
  it('should reject disabled methods', () => {
    expect(isPaymentMethodOfferable({ enabled: false, provider: 'payos' })).toBe(false);
  });

  it('should accept a normal enabled gateway', () => {
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'payos' })).toBe(true);
  });

  it('should accept the demo method outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEMO_PAYMENTS', '');
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'demo' })).toBe(true);
  });

  it('should hide the demo method in production unless explicitly enabled', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOW_DEMO_PAYMENTS', '');
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'demo' })).toBe(false);
    vi.stubEnv('ALLOW_DEMO_PAYMENTS', 'true');
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'demo' })).toBe(true);
  });
});
