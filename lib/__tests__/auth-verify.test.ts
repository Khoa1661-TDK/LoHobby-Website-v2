import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { autoVerifyGoogleUser } from '@/lib/auth-verify';
import { prisma } from '@/lib/prisma';

const findUniqueMock = vi.mocked(prisma.user.findUnique);
const updateMock = vi.mocked(prisma.user.update);

afterEach(() => {
  vi.clearAllMocks();
});

describe('autoVerifyGoogleUser', () => {
  it('should mark the user verified when not already verified', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);

    await autoVerifyGoogleUser('u1');

    expect(updateMock).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it('should not write when already verified', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: new Date() } as never);

    await autoVerifyGoogleUser('u1');

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should not throw and not write when the user does not exist', async () => {
    findUniqueMock.mockResolvedValue(null);

    await expect(autoVerifyGoogleUser('missing')).resolves.toBeUndefined();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
