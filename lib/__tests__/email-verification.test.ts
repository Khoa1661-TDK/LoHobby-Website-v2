import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    verificationToken: {
      deleteMany: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      delete: vi.fn().mockResolvedValue({}),
    },
    user: { update: vi.fn() },
  },
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));

import {
  consumeVerificationToken,
  issueVerificationEmail,
  verificationIdentifier,
} from '@/lib/email-verification';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/send';

const deleteManyMock = vi.mocked(prisma.verificationToken.deleteMany);
const createMock = vi.mocked(prisma.verificationToken.create);
const findUniqueMock = vi.mocked(prisma.verificationToken.findUnique);
const deleteMock = vi.mocked(prisma.verificationToken.delete);
const updateMock = vi.mocked(prisma.user.update);
const sendEmailMock = vi.mocked(sendEmail);

afterEach(() => {
  vi.clearAllMocks();
});

describe('verificationIdentifier', () => {
  it('should namespace the identifier so it never collides with a password-reset token for the same email', () => {
    expect(verificationIdentifier('buyer@example.com')).toBe('verify-email:buyer@example.com');
    expect(verificationIdentifier('buyer@example.com')).not.toBe('buyer@example.com');
  });

  it('should normalize the email to lowercase', () => {
    expect(verificationIdentifier('Buyer@Example.com')).toBe('verify-email:buyer@example.com');
  });
});

describe('issueVerificationEmail', () => {
  it('should clear prior verification tokens, store a new one, and send the email', async () => {
    sendEmailMock.mockResolvedValue({ configured: true, sent: true });

    await issueVerificationEmail('buyer@example.com');

    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { identifier: 'verify-email:buyer@example.com' },
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    const createArgs = createMock.mock.calls[0][0] as {
      data: { identifier: string; token: string; expires: Date };
    };
    expect(createArgs.data.identifier).toBe('verify-email:buyer@example.com');
    expect(createArgs.data.token).toHaveLength(64);
    expect(createArgs.data.expires.getTime()).toBeGreaterThan(Date.now() + 23 * 60 * 60 * 1000);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@example.com', subject: 'Xác minh địa chỉ email' }),
    );
  });
});

describe('consumeVerificationToken', () => {
  it('should return invalid for a missing token', async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await consumeVerificationToken('missing-token');

    expect(result).toEqual({ status: 'invalid' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should return invalid for a token that is not a verification token (foreign identifier)', async () => {
    findUniqueMock.mockResolvedValue({
      identifier: 'buyer@example.com',
      token: 'tok',
      expires: new Date(Date.now() + 1000),
    } as never);

    const result = await consumeVerificationToken('tok');

    expect(result).toEqual({ status: 'invalid' });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should return expired and delete the token when past its expiry', async () => {
    findUniqueMock.mockResolvedValue({
      identifier: 'verify-email:buyer@example.com',
      token: 'tok',
      expires: new Date(Date.now() - 1000),
    } as never);

    const result = await consumeVerificationToken('tok');

    expect(result).toEqual({ status: 'expired' });
    expect(deleteMock).toHaveBeenCalledWith({ where: { token: 'tok' } });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should mark the user verified and delete the token on success', async () => {
    findUniqueMock.mockResolvedValue({
      identifier: 'verify-email:buyer@example.com',
      token: 'tok',
      expires: new Date(Date.now() + 1000),
    } as never);
    updateMock.mockResolvedValue({} as never);

    const result = await consumeVerificationToken('tok');

    expect(result).toEqual({ status: 'success', email: 'buyer@example.com' });
    expect(updateMock).toHaveBeenCalledWith({
      where: { email: 'buyer@example.com' },
      data: { emailVerified: expect.any(Date) },
    });
    expect(deleteMock).toHaveBeenCalledWith({ where: { token: 'tok' } });
  });

  it('should return invalid without deleting the token when the user update fails', async () => {
    findUniqueMock.mockResolvedValue({
      identifier: 'verify-email:buyer@example.com',
      token: 'tok',
      expires: new Date(Date.now() + 1000),
    } as never);
    updateMock.mockRejectedValue(new Error('user not found'));

    const result = await consumeVerificationToken('tok');

    expect(result).toEqual({ status: 'invalid' });
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
