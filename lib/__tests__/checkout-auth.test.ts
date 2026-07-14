import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { requireVerifiedCheckoutUser } from '@/lib/checkout-auth';
import { prisma } from '@/lib/prisma';

const findUniqueMock = vi.mocked(prisma.user.findUnique);

afterEach(() => {
  vi.clearAllMocks();
});

describe('requireVerifiedCheckoutUser', () => {
  it('should return 401 when there is no session', async () => {
    const result = await requireVerifiedCheckoutUser(null);

    expect(result).toEqual({ ok: false, status: 401, error: expect.any(String) });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('should return 403 when the account exists but is unverified', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });

  it('should return 403 when the account cannot be found', async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({ ok: false, status: 403, error: expect.any(String) });
  });

  it('should return ok for a verified account', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: new Date() } as never);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({ ok: true });
  });
});
