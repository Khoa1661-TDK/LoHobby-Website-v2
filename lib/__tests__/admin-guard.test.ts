// lib/__tests__/admin-guard.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
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

// lib/admin-emails.ts — ADMIN_EMAILS must fail closed (empty), never fall back
// to a hardcoded public admin email, when unset or misconfigured.
describe('isAdminEmail (fail-closed, no hardcoded fallback)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('should return false for every input when ADMIN_EMAILS is unset', async () => {
    vi.stubEnv('ADMIN_EMAILS', undefined);
    vi.resetModules();
    const { ADMIN_EMAILS, isAdminEmail } = await import('@/lib/admin-emails');

    expect(ADMIN_EMAILS).toEqual([]);
    expect(isAdminEmail('admin@shop.test')).toBe(false);
    expect(isAdminEmail('your-email@gmail.com')).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });

  it('should return false for every input when ADMIN_EMAILS parses to an empty list', async () => {
    vi.stubEnv('ADMIN_EMAILS', '   ,  ,');
    vi.resetModules();
    const { ADMIN_EMAILS, isAdminEmail } = await import('@/lib/admin-emails');

    expect(ADMIN_EMAILS).toEqual([]);
    expect(isAdminEmail('admin@shop.test')).toBe(false);
  });

  it('should still recognize a configured allowlist', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'Admin@Shop.test, second@shop.test');
    vi.resetModules();
    const { isAdminEmail } = await import('@/lib/admin-emails');

    expect(isAdminEmail('admin@shop.test')).toBe(true);
    expect(isAdminEmail('second@shop.test')).toBe(true);
    expect(isAdminEmail('nope@shop.test')).toBe(false);
  });
});

// lib/admin.ts — admin recognition must require the Google OAuth provider, not
// just an allowlisted email, to close the register-then-race privilege
// escalation (attacker registers the admin's email via credentials first).
describe('getAdminUser provider gating', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.doUnmock('@/auth');
  });

  it('should return null when the email matches the allowlist but provider is "credentials"', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@shop.test');
    vi.doMock('@/auth', () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: 'u1', email: 'admin@shop.test', name: 'Admin', provider: 'credentials' },
      }),
    }));
    vi.resetModules();

    const { getAdminUser } = await import('@/lib/admin');
    expect(await getAdminUser()).toBeNull();
  });

  it('should return null when the email matches the allowlist but provider is missing', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@shop.test');
    vi.doMock('@/auth', () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: 'u1', email: 'admin@shop.test', name: 'Admin' },
      }),
    }));
    vi.resetModules();

    const { getAdminUser } = await import('@/lib/admin');
    expect(await getAdminUser()).toBeNull();
  });

  it('should return the admin when the email matches the allowlist and provider is "google"', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@shop.test');
    vi.doMock('@/auth', () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: 'u1', email: 'admin@shop.test', name: 'Admin', provider: 'google' },
      }),
    }));
    vi.resetModules();

    const { getAdminUser } = await import('@/lib/admin');
    expect(await getAdminUser()).toEqual({ id: 'u1', email: 'admin@shop.test', name: 'Admin' });
  });

  it('should return null when the email does not match the allowlist even with provider "google"', async () => {
    vi.stubEnv('ADMIN_EMAILS', 'admin@shop.test');
    vi.doMock('@/auth', () => ({
      auth: vi.fn().mockResolvedValue({
        user: { id: 'u2', email: 'nope@shop.test', name: 'Nope', provider: 'google' },
      }),
    }));
    vi.resetModules();

    const { getAdminUser } = await import('@/lib/admin');
    expect(await getAdminUser()).toBeNull();
  });
});