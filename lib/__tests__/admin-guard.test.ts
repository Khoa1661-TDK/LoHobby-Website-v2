// lib/__tests__/admin-guard.test.ts
import { describe, expect, it, vi } from 'vitest';
import { isAuthorizedAdmin } from '@/lib/page-builder/admin-guard';

describe('isAuthorizedAdmin', () => {
  it('should return true when payload.auth yields an allowlisted admin user', async () => {
    const payload = { auth: vi.fn().mockResolvedValue({ user: { email: 'admin@shop.test' } }) };
    const result = await isAuthorizedAdmin(payload as never, new Headers(), () => true);
    expect(result).toBe(true);
  });

  it('should return false when there is no user', async () => {
    const payload = { auth: vi.fn().mockResolvedValue({ user: null }) };
    const result = await isAuthorizedAdmin(payload as never, new Headers(), () => true);
    expect(result).toBe(false);
  });

  it('should return false when the user is not allowlisted', async () => {
    const payload = { auth: vi.fn().mockResolvedValue({ user: { email: 'nope@x.test' } }) };
    const result = await isAuthorizedAdmin(payload as never, new Headers(), () => false);
    expect(result).toBe(false);
  });

  it('should return false and not throw when auth rejects', async () => {
    const payload = { auth: vi.fn().mockRejectedValue(new Error('no session')) };
    const result = await isAuthorizedAdmin(payload as never, new Headers(), () => true);
    expect(result).toBe(false);
  });
});