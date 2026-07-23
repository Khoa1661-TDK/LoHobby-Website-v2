import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/feature-flags', () => ({
  isEmailVerificationRequired: vi.fn(),
}));

import { requireVerifiedCheckoutUser } from '@/lib/checkout-auth';
import { isEmailVerificationRequired } from '@/lib/feature-flags';
import { prisma } from '@/lib/prisma';

const findUniqueMock = vi.mocked(prisma.user.findUnique);
const isEmailVerificationRequiredMock = vi.mocked(isEmailVerificationRequired);

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  isEmailVerificationRequiredMock.mockReturnValue(true);
});

describe('requireVerifiedCheckoutUser', () => {
  it('should return 401 when there is no session', async () => {
    const result = await requireVerifiedCheckoutUser(null);

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: expect.any(String),
      code: 'authRequired',
    });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('should return 403 when the account exists but is unverified', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: expect.any(String),
      code: 'emailUnverified',
    });
  });

  it('should return 403 when the account cannot be found', async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: expect.any(String),
      code: 'emailUnverified',
    });
  });

  it('should return ok for a verified account', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: new Date() } as never);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({ ok: true });
  });

  it('should skip the verification check without querying prisma when the flag is off', async () => {
    isEmailVerificationRequiredMock.mockReturnValue(false);

    const result = await requireVerifiedCheckoutUser('u1');

    expect(result).toEqual({ ok: true });
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('should still require a session when the flag is off', async () => {
    isEmailVerificationRequiredMock.mockReturnValue(false);

    const result = await requireVerifiedCheckoutUser(null);

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: expect.any(String),
      code: 'authRequired',
    });
  });
});
