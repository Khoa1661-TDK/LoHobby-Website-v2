import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: vi.fn() }));
vi.mock('@/lib/feature-flags', () => ({ isStoreCustomerSyncEnabled: () => true }));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));

import { getPayload } from 'payload';
import { prisma } from '@/lib/prisma';
import { syncStoreCustomerForUser } from '@/lib/store-customer-sync';

const mockGetPayload = vi.mocked(getPayload);

afterEach(() => {
  vi.clearAllMocks();
});

describe('syncStoreCustomerForUser', () => {
  it('should re-resolve when the cached payloadCustomerId points to a deleted store-customer', async () => {
    // Prisma user carries a stale pointer to a store-customer that no longer exists.
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      name: 'A',
      payloadCustomerId: '1',
    } as never);

    const findByID = vi.fn().mockRejectedValue(new Error('Not Found')); // row 1 is gone
    const find = vi.fn().mockResolvedValue({ docs: [] }); // none by email either
    const create = vi.fn().mockResolvedValue({ id: 7 });
    const update = vi.fn();
    mockGetPayload.mockResolvedValue({ findByID, find, create, update } as never);

    const result = await syncStoreCustomerForUser('u1');

    // Must NOT return the dangling '1' (that caused the FK violation at checkout).
    expect(result).toBe('7');
    expect(create).toHaveBeenCalledTimes(1);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { payloadCustomerId: '7' } }),
    );
  });

  it('should trust the cached payloadCustomerId when the store-customer still exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      name: 'A',
      payloadCustomerId: '5',
    } as never);

    const findByID = vi.fn().mockResolvedValue({ id: 5 });
    const find = vi.fn();
    const create = vi.fn();
    mockGetPayload.mockResolvedValue({ findByID, find, create, update: vi.fn() } as never);

    const result = await syncStoreCustomerForUser('u1');

    expect(result).toBe('5');
    expect(findByID).toHaveBeenCalledTimes(1);
    expect(create).not.toHaveBeenCalled();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
