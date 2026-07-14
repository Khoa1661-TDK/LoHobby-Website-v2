import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
vi.mock('@/lib/email-verification', () => ({ issueVerificationEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { POST } from '@/app/api/auth/resend-verification/route';
import { prisma } from '@/lib/prisma';
import { issueVerificationEmail } from '@/lib/email-verification';

const findUniqueMock = vi.mocked(prisma.user.findUnique);
const issueVerificationEmailMock = vi.mocked(issueVerificationEmail);

function post(body: unknown): Request {
  return new Request('http://localhost/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/auth/resend-verification', () => {
  it('should reject an invalid email', async () => {
    const res = await POST(post({ email: 'not-an-email' }));

    expect(res.status).toBe(400);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('should respond ok without resending for a non-existent account (enumeration-safe)', async () => {
    findUniqueMock.mockResolvedValue(null);

    const res = await POST(post({ email: 'nobody@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(issueVerificationEmailMock).not.toHaveBeenCalled();
  });

  it('should respond ok without resending for an already-verified account', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: new Date() } as never);

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(issueVerificationEmailMock).not.toHaveBeenCalled();
  });

  it('should resend and respond ok for an unverified account', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);
    issueVerificationEmailMock.mockResolvedValue(undefined);

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(issueVerificationEmailMock).toHaveBeenCalledWith('buyer@example.com');
  });

  it('should still respond ok when issuing the email throws', async () => {
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);
    issueVerificationEmailMock.mockRejectedValue(new Error('resend down'));

    const res = await POST(post({ email: 'buyer@example.com' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
