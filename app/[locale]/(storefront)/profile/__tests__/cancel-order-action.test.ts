import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted is required here (not plain `const x = vi.fn()`): `@/auth` pulls in
// next-auth/bcryptjs/Prisma adapter, and Vitest's mock-hoisting transform races
// with that heavier module graph, producing a "Cannot access before
// initialization" TDZ error unless the mock fns are themselves hoisted.
const { authMock, findByID, update, cancelOrder } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findByID: vi.fn(),
  update: vi.fn(),
  cancelOrder: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({ findByID, update })),
}));
vi.mock('@/lib/order-fulfillment', () => ({ cancelOrder }));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
// actions.ts transitively imports lib/cart.ts -> lib/prisma.ts. lib/prisma.ts
// builds a real PrismaPg client at module-load time and throws if DATABASE_URL
// isn't set in the test env, so it must be mocked (same pattern as
// lib/__tests__/store-customer-sync.test.ts and app/health/ready/__tests__/route.test.ts).
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { cancelOrderAction } from '@/app/[locale]/(storefront)/profile/actions';

const OWNER = { user: { id: 'user-1', email: 'a@example.com' } };

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue(OWNER);
  cancelOrder.mockResolvedValue({ ok: true, order: {} });
  update.mockResolvedValue({});
});

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    orderStatus: 'pending',
    paymentStatus: 'paid',
    metadata: { prismaUserId: 'user-1' },
    buyerEmail: 'a@example.com',
    ...overrides,
  };
}

describe('cancelOrderAction', () => {
  it('should reject when the user does not own the order', async () => {
    findByID.mockResolvedValue(order({ metadata: { prismaUserId: 'someone-else' }, buyerEmail: 'b@example.com' }));
    const res = await cancelOrderAction('42', 'changed_mind');
    expect(res.ok).toBe(false);
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('should reject when the order is already shipped', async () => {
    findByID.mockResolvedValue(order({ orderStatus: 'shipped' }));
    const res = await cancelOrderAction('42', 'changed_mind');
    expect(res.ok).toBe(false);
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('should reject an invalid reason value', async () => {
    findByID.mockResolvedValue(order());
    const res = await cancelOrderAction('42', 'not_a_reason');
    expect(res.ok).toBe(false);
    expect(cancelOrder).not.toHaveBeenCalled();
  });

  it('should persist the reason and call cancelOrder for a pending owned order', async () => {
    findByID.mockResolvedValue(order({ orderStatus: 'processing' }));
    const res = await cancelOrderAction('42', 'found_better_price', 'too pricey');
    expect(res.ok).toBe(true);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'orders',
        id: 42,
        data: { cancellationReason: 'found_better_price', cancellationNote: 'too pricey' },
      }),
    );
    expect(cancelOrder).toHaveBeenCalledWith(42);
  });

  it('should not change paymentStatus (paid orders stay paid)', async () => {
    findByID.mockResolvedValue(order({ paymentStatus: 'paid' }));
    await cancelOrderAction('42', 'changed_mind');
    const updateData = update.mock.calls[0]?.[0]?.data ?? {};
    expect(updateData).not.toHaveProperty('paymentStatus');
  });
});
