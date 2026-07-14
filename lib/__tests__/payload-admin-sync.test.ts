import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({
  getPayload: vi.fn(),
  generatePayloadCookie: vi.fn(),
}));
vi.mock('@/lib/admin-emails', () => ({
  isAdminEmail: vi.fn(() => true),
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('next/headers', () => ({ headers: vi.fn() }));

import { getPayload } from 'payload';
import { derivePayloadPassword, ensurePayloadAdminUser } from '@/lib/payload-admin-sync';

const mockGetPayload = vi.mocked(getPayload);

function mockPayload(overrides: {
  find: ReturnType<typeof vi.fn>;
  create?: ReturnType<typeof vi.fn>;
  update?: ReturnType<typeof vi.fn>;
}) {
  const create = overrides.create ?? vi.fn();
  const update = overrides.update ?? vi.fn();
  mockGetPayload.mockResolvedValue({
    find: overrides.find,
    create,
    update,
  } as never);
  return { create, update };
}

beforeEach(() => {
  process.env.PAYLOAD_SECRET = 'test-payload-secret';
  delete process.env.AUTH_SECRET;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('derivePayloadPassword', () => {
  it('should return the same digest when called twice with identical inputs', () => {
    const a = derivePayloadPassword('admin@example.com', 'salt-1');
    const b = derivePayloadPassword('admin@example.com', 'salt-1');
    expect(a).toBe(b);
  });

  it('should change output when the salt changes but email and secret stay fixed', () => {
    const a = derivePayloadPassword('admin@example.com', 'salt-1');
    const b = derivePayloadPassword('admin@example.com', 'salt-2');
    expect(a).not.toBe(b);
  });

  it('should change output when the email changes but salt and secret stay fixed', () => {
    const a = derivePayloadPassword('admin@example.com', 'salt-1');
    const b = derivePayloadPassword('other@example.com', 'salt-1');
    expect(a).not.toBe(b);
  });

  it('should change output when the secret changes but salt and email stay fixed', () => {
    process.env.PAYLOAD_SECRET = 'secret-one';
    const a = derivePayloadPassword('admin@example.com', 'salt-1');
    process.env.PAYLOAD_SECRET = 'secret-two';
    const b = derivePayloadPassword('admin@example.com', 'salt-1');
    expect(a).not.toBe(b);
  });
});

describe('ensurePayloadAdminUser', () => {
  it('should create a new user with a freshly generated salt and a matching password', async () => {
    const find = vi.fn().mockResolvedValue({ docs: [] });
    const { create } = mockPayload({ find });

    const result = await ensurePayloadAdminUser({ email: 'new@example.com', name: 'New Admin' });

    expect(create).toHaveBeenCalledTimes(1);
    const createData = create.mock.calls[0]![0].data as { ssoSalt: string; password: string };
    expect(createData.ssoSalt).toBe(result.salt);
    expect(createData.password).toBe(derivePayloadPassword('new@example.com', result.salt));
  });

  it('should backfill a salt and rewrite the password when an existing row has no ssoSalt', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 1, name: 'Existing', ssoSalt: null }],
    });
    const { update } = mockPayload({ find });

    const result = await ensurePayloadAdminUser({ email: 'existing@example.com', name: 'Existing' });

    expect(update).toHaveBeenCalledTimes(1);
    const updateData = update.mock.calls[0]![0].data as { ssoSalt: string; password: string };
    expect(updateData.ssoSalt).toBe(result.salt);
    expect(updateData.password).toBe(derivePayloadPassword('existing@example.com', result.salt));
  });

  it('should not write to the database when name and salt are unchanged and no reset is requested', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 1, name: 'Existing', ssoSalt: 'stable-salt' }],
    });
    const { update } = mockPayload({ find });

    const result = await ensurePayloadAdminUser({ email: 'existing@example.com', name: 'Existing' });

    expect(update).not.toHaveBeenCalled();
    expect(result.salt).toBe('stable-salt');
  });

  it('should rotate the salt and rewrite the password on a forced password reset', async () => {
    const find = vi.fn().mockResolvedValue({
      docs: [{ id: 1, name: 'Existing', ssoSalt: 'old-salt' }],
    });
    const { update } = mockPayload({ find });

    const result = await ensurePayloadAdminUser(
      { email: 'existing@example.com', name: 'Existing' },
      { forcePasswordReset: true },
    );

    expect(update).toHaveBeenCalledTimes(1);
    const updateData = update.mock.calls[0]![0].data as {
      ssoSalt: string;
      password: string;
      loginAttempts: number;
      lockUntil: null;
    };
    expect(updateData.ssoSalt).not.toBe('old-salt');
    expect(updateData.ssoSalt).toBe(result.salt);
    expect(updateData.password).toBe(derivePayloadPassword('existing@example.com', result.salt));
    expect(updateData.loginAttempts).toBe(0);
    expect(updateData.lockUntil).toBeNull();
  });
});
