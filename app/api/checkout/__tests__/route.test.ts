import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    purchaseEvent: { create: vi.fn() },
  },
}));

import { POST } from '@/app/api/checkout/route';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const authMock = vi.mocked(auth);
const findUniqueMock = vi.mocked(prisma.user.findUnique);

function post(body: unknown): Request {
  return new Request('http://localhost/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('POST /api/checkout — authorization gate', () => {
  it('should reject an unauthenticated request with 401', async () => {
    authMock.mockResolvedValue(null as never);

    const res = await POST(post({}) as never);

    expect(res.status).toBe(401);
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  it('should reject a logged-in but unverified account with 403', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', email: 'buyer@example.com' } } as never);
    findUniqueMock.mockResolvedValue({ emailVerified: null } as never);

    const res = await POST(post({}) as never);

    expect(res.status).toBe(403);
  });

  it('should reject when the account cannot be found with 403', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', email: 'buyer@example.com' } } as never);
    findUniqueMock.mockResolvedValue(null);

    const res = await POST(post({}) as never);

    expect(res.status).toBe(403);
  });

  it('should pass the gate for a verified account and fail on body validation instead', async () => {
    authMock.mockResolvedValue({ user: { id: 'u1', email: 'buyer@example.com' } } as never);
    findUniqueMock.mockResolvedValue({ emailVerified: new Date() } as never);

    const res = await POST(post({}) as never);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Dữ liệu thanh toán không hợp lệ' });
  });
});
