import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api-guard', () => ({ enforceRateLimit: vi.fn(() => null) }));
vi.mock('@/lib/feature-flags', () => ({ isDemoPaymentAllowed: vi.fn(() => true) }));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/payload-orders', () => ({ getPayloadOrderByCode: vi.fn() }));
vi.mock('@/lib/payment-methods', () => ({ getPaymentMethodByKey: vi.fn() }));
vi.mock('@/lib/payload-order-storefront', () => ({
  ownsPayloadOrder: vi.fn(() => true),
  mapPayloadOrderToStorefrontStatus: vi.fn(() => 'PENDING_ONLINE'),
}));
vi.mock('@/lib/admin-emails', () => ({ isAdminEmail: vi.fn(() => false) }));
vi.mock('@/lib/payment-webhook-handler', () => ({
  applyVerifiedWebhookPayment: vi.fn(async () => ({ matched: true })),
}));

import { POST } from '@/app/api/checkout/demo/confirm/route';
import { auth } from '@/auth';
import { isDemoPaymentAllowed } from '@/lib/feature-flags';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import { getPaymentMethodByKey } from '@/lib/payment-methods';
import { ownsPayloadOrder } from '@/lib/payload-order-storefront';
import { applyVerifiedWebhookPayment } from '@/lib/payment-webhook-handler';

const authMock = vi.mocked(auth);
const allowedMock = vi.mocked(isDemoPaymentAllowed);
const orderMock = vi.mocked(getPayloadOrderByCode);
const methodMock = vi.mocked(getPaymentMethodByKey);
const ownsMock = vi.mocked(ownsPayloadOrder);
const applyMock = vi.mocked(applyVerifiedWebhookPayment);

function post(body: unknown): Request {
  return new Request('http://localhost/api/checkout/demo/confirm', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const session = { user: { id: 'u1', email: 'buyer@example.com' } };
const demoOrder = { paymentMethodKey: 'demo', totalAmount: 150_000 };

afterEach(() => {
  vi.clearAllMocks();
  allowedMock.mockReturnValue(true);
  ownsMock.mockReturnValue(true);
});

describe('POST /api/checkout/demo/confirm', () => {
  it('should reject when demo payments are not allowed', async () => {
    allowedMock.mockReturnValue(false);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(403);
    expect(applyMock).not.toHaveBeenCalled();
  });

  it('should reject an unauthenticated request', async () => {
    authMock.mockResolvedValue(null as never);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(401);
  });

  it('should reject a foreign order', async () => {
    authMock.mockResolvedValue(session as never);
    orderMock.mockResolvedValue(demoOrder as never);
    methodMock.mockResolvedValue({ provider: 'demo' } as never);
    ownsMock.mockReturnValue(false);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(403);
    expect(applyMock).not.toHaveBeenCalled();
  });

  it('should reject a non-demo order', async () => {
    authMock.mockResolvedValue(session as never);
    orderMock.mockResolvedValue({ paymentMethodKey: 'payos', totalAmount: 1 } as never);
    methodMock.mockResolvedValue({ provider: 'payos' } as never);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(400);
    expect(applyMock).not.toHaveBeenCalled();
  });

  it('should mark a valid demo order paid via the real paid path', async () => {
    authMock.mockResolvedValue(session as never);
    orderMock.mockResolvedValue(demoOrder as never);
    methodMock.mockResolvedValue({ provider: 'demo' } as never);
    const res = await POST(post({ orderCode: 4242 }) as never);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ success: true });
    expect(applyMock).toHaveBeenCalledWith({
      orderCode: 4242,
      amount: 150_000,
      success: true,
    });
  });
});
