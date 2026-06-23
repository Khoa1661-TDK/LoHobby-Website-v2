import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isPaymentMethodOfferable } from '@/lib/payment-methods';

const original = { ...process.env };

beforeEach(() => {
  delete process.env.ALLOW_DEMO_PAYMENTS;
});

afterEach(() => {
  process.env = { ...original };
});

describe('isPaymentMethodOfferable', () => {
  it('should reject disabled methods', () => {
    expect(isPaymentMethodOfferable({ enabled: false, provider: 'payos' })).toBe(false);
  });

  it('should accept a normal enabled gateway', () => {
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'payos' })).toBe(true);
  });

  it('should accept the demo method outside production', () => {
    process.env.NODE_ENV = 'development';
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'demo' })).toBe(true);
  });

  it('should hide the demo method in production unless explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'demo' })).toBe(false);
    process.env.ALLOW_DEMO_PAYMENTS = 'true';
    expect(isPaymentMethodOfferable({ enabled: true, provider: 'demo' })).toBe(true);
  });
});
