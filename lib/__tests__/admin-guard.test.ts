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

  it('should authorize via the JWT fallback when the cookie path is CSRF-gated but a payload-token cookie is present', async () => {
    // First call (cookie strategy) is CSRF-gated and yields no user; the retry
    // with an Authorization: JWT header resolves the same user.
    const auth = vi
      .fn()
      .mockResolvedValueOnce({ user: null })
      .mockResolvedValueOnce({ user: { email: 'admin@shop.test' } });
    const payload = { auth };
    const headers = new Headers({ cookie: 'payload-token=signed.jwt.value' });

    const result = await isAuthorizedAdmin(payload as never, headers, () => true);

    expect(result).toBe(true);
    expect(auth).toHaveBeenCalledTimes(2);
    const retryHeaders = auth.mock.calls[1]![0].headers as Headers;
    expect(retryHeaders.get('authorization')).toBe('JWT signed.jwt.value');
  });

  it('should not retry the JWT fallback when no payload-token cookie is present', async () => {
    const auth = vi.fn().mockResolvedValue({ user: null });
    const payload = { auth };
    const result = await isAuthorizedAdmin(payload as never, new Headers(), () => true);
    expect(result).toBe(false);
    expect(auth).toHaveBeenCalledTimes(1);
  });
});