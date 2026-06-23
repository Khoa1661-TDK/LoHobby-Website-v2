import { describe, expect, it } from 'vitest';
import { demoProvider } from '@/lib/providers/demo';
import { getPaymentProvider, isPaymentProviderId } from '@/lib/payment-providers';
import type { CreatePaymentArgs } from '@/lib/payment-provider-types';

const baseArgs: CreatePaymentArgs = {
  orderCode: 4242,
  amount: 150_000,
  description: 'Đơn hàng 4242',
  items: [{ name: 'Item', quantity: 1, price: 150_000 }],
  returnUrl: 'https://shop.example/checkout/success?orderCode=4242',
  cancelUrl: 'https://shop.example/checkout/cancel?orderCode=4242',
  origin: 'https://shop.example',
  sandboxMode: true,
};

describe('demo payment provider', () => {
  it('should be a recognised provider id', () => {
    expect(isPaymentProviderId('demo')).toBe(true);
    expect(getPaymentProvider('demo')).toBe(demoProvider);
  });

  it('should return an internal demo gate checkout url keyed by order code', async () => {
    const result = await demoProvider.createPaymentLink(baseArgs, { provider: 'demo' });
    expect(result.checkoutUrl).toBe('https://shop.example/checkout/demo?orderCode=4242');
    expect(result.qrCode).toBeUndefined();
  });

  it('should reject mismatched credentials', async () => {
    await expect(
      demoProvider.createPaymentLink(baseArgs, { provider: 'payos' } as never),
    ).rejects.toThrow();
  });

  it('should throw if asked to verify a webhook (demo has no external webhook)', async () => {
    await expect(
      demoProvider.verifyWebhook(
        { body: {}, rawBody: '', headers: new Headers() },
        { provider: 'demo' },
      ),
    ).rejects.toThrow();
  });
});
