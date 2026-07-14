import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/admin', () => ({ isAdminEmail: vi.fn(() => false) }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));
vi.mock('@/lib/email-verification', () => ({ issueVerificationEmail: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));

import { POST } from '@/app/api/register/route';
import { isAdminEmail } from '@/lib/admin';
import { prisma } from '@/lib/prisma';
import { issueVerificationEmail } from '@/lib/email-verification';

const isAdminEmailMock = vi.mocked(isAdminEmail);
const findUniqueMock = vi.mocked(prisma.user.findUnique);
const createMock = vi.mocked(prisma.user.create);
const issueVerificationEmailMock = vi.mocked(issueVerificationEmail);

function post(body: unknown): Request {
  return new Request('http://localhost/api/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = { email: 'buyer@example.com', password: 'password123', name: 'Buyer' };

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/register', () => {
  it('should reject registration for an email on the admin allowlist', async () => {
    isAdminEmailMock.mockReturnValue(true);

    const res = await POST(post({ ...validBody, email: 'admin@shop.test' }) as never);

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'Email này không thể tự đăng ký' });
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should reject an invalid email before checking the admin allowlist', async () => {
    isAdminEmailMock.mockReturnValue(true);

    const res = await POST(post({ ...validBody, email: 'not-an-email' }) as never);

    expect(res.status).toBe(400);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should reject when the email is already registered', async () => {
    isAdminEmailMock.mockReturnValue(false);
    findUniqueMock.mockResolvedValue({ id: 'u1' } as never);

    const res = await POST(post(validBody) as never);

    expect(res.status).toBe(409);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create a non-admin user and send a verification email for a valid, unregistered email', async () => {
    isAdminEmailMock.mockReturnValue(false);
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'u1',
      email: validBody.email,
      name: validBody.name,
      createdAt: new Date(),
    } as never);
    issueVerificationEmailMock.mockResolvedValue(undefined);

    const res = await POST(post(validBody) as never);

    expect(res.status).toBe(201);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(issueVerificationEmailMock).toHaveBeenCalledWith(validBody.email);
  });

  it('should still return 201 when the verification email fails to send', async () => {
    isAdminEmailMock.mockReturnValue(false);
    findUniqueMock.mockResolvedValue(null);
    createMock.mockResolvedValue({
      id: 'u1',
      email: validBody.email,
      name: validBody.name,
      createdAt: new Date(),
    } as never);
    issueVerificationEmailMock.mockRejectedValue(new Error('resend down'));

    const res = await POST(post(validBody) as never);

    expect(res.status).toBe(201);
  });
});
