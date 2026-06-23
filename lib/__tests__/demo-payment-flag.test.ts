import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isDemoPaymentAllowed } from '@/lib/feature-flags';

const original = { ...process.env };

beforeEach(() => {
  delete process.env.ALLOW_DEMO_PAYMENTS;
});

afterEach(() => {
  process.env = { ...original };
});

describe('isDemoPaymentAllowed', () => {
  it('should allow demo payments outside production by default', () => {
    process.env.NODE_ENV = 'development';
    expect(isDemoPaymentAllowed()).toBe(true);
  });

  it('should block demo payments in production by default', () => {
    process.env.NODE_ENV = 'production';
    expect(isDemoPaymentAllowed()).toBe(false);
  });

  it('should allow demo payments in production when explicitly enabled', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DEMO_PAYMENTS = 'true';
    expect(isDemoPaymentAllowed()).toBe(true);
  });
});
