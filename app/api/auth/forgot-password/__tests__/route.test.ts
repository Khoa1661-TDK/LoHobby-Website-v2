import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    verificationToken: { deleteMany: vi.fn(), create: vi.fn() },
  },
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { debug: vi.fn(), error: vi.fn() } }));

import { POST } from '@/app/api/auth/forgot-password/route';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email/send';

const findUniqueMock = vi.mocked(prisma.user.findUnique);
const deleteManyMock = vi.mocked(prisma.verificationToken.deleteMany);
const createMock = vi.mocked(prisma.verificationToken.create);
const sendEmailMock = vi.mocked(sendEmail);

function post(body: unknown): Request {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/forgot-password', () => {
  it('should respond ok without sending when the email is not registered', async () => {
    findUniqueMock.mockResolvedValue(null);

    const res = await POST(post({ email: 'nobody@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('should issue a token and send a reset email for a registered address', async () => {
    findUniqueMock.mockResolvedValue({ id: 'u1' } as never);
    sendEmailMock.mockResolvedValue({ configured: true, sent: true });

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(deleteManyMock).toHaveBeenCalledWith({ where: { identifier: 'buyer@example.com' } });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@example.com', subject: 'Đặt lại mật khẩu' }),
    );
  });

  it('should still respond ok when the email send fails', async () => {
    findUniqueMock.mockResolvedValue({ id: 'u1' } as never);
    sendEmailMock.mockResolvedValue({ configured: true, sent: false });

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('should reject an invalid email before touching the database', async () => {
    const res = await POST(post({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
