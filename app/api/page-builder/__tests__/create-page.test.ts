// app/api/page-builder/__tests__/create-page.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));

const mockCreate = vi.fn();
const mockGetPayload = vi.fn();
const mockIsAuthorizedAdmin = vi.fn();

vi.mock('payload', () => ({ getPayload: (...a: unknown[]) => mockGetPayload(...a) }));
vi.mock('@/lib/page-builder/admin-guard', () => ({
  isAuthorizedAdmin: (...a: unknown[]) => mockIsAuthorizedAdmin(...a),
}));

import { POST } from '@/app/api/page-builder/create-page/route';

beforeEach(() => {
  mockCreate.mockReset();
  mockGetPayload.mockReset();
  mockIsAuthorizedAdmin.mockReset();
  mockGetPayload.mockResolvedValue({ create: mockCreate });
});

describe('POST /api/page-builder/create-page', () => {
  it('should create a blank draft page and return the builder href', async () => {
    mockIsAuthorizedAdmin.mockResolvedValue(true);
    mockCreate.mockResolvedValue({ id: 7, slug: 'untitled' });

    const res = await POST();

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ href: '/vi/build/untitled' });
    const createArg = mockCreate.mock.calls[0]?.[0];
    expect(createArg.collection).toBe('pages');
    expect(createArg.data.title).toBe('Untitled');
    expect(createArg.data.status).toBe('draft');
    expect(createArg.data.layout).toEqual([]);
  });

  it('should return 401 when the caller is not an authorized admin', async () => {
    mockIsAuthorizedAdmin.mockResolvedValue(false);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
