import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Payload } from 'payload';
import {
  getZaloConfig,
  isConfigComplete,
  getValidAccessToken,
  type ZaloOaConfig,
} from '@/lib/zalo/oa-client';

function fakePayload(globalDoc: Record<string, unknown>) {
  const updateGlobal = vi.fn().mockResolvedValue(globalDoc);
  const findGlobal = vi.fn().mockResolvedValue(globalDoc);
  return { findGlobal, updateGlobal } as unknown as Payload & {
    findGlobal: ReturnType<typeof vi.fn>;
    updateGlobal: ReturnType<typeof vi.fn>;
  };
}

function baseConfig(overrides: Partial<ZaloOaConfig> = {}): ZaloOaConfig {
  return {
    enabled: true,
    appId: 'app-1',
    appSecret: 'secret-1',
    recipientUserId: 'user-1',
    accessToken: 'old-access',
    refreshToken: 'old-refresh',
    tokenExpiresAt: Date.now() + 60 * 60 * 1000,
    ...overrides,
  };
}

describe('getZaloConfig', () => {
  it('should map the notification-settings global into a typed config', async () => {
    const payload = fakePayload({
      zaloEnabled: true,
      zaloAppId: 'app-1',
      zaloAppSecret: 'secret-1',
      zaloRecipientUserId: 'user-1',
      zaloAccessToken: 'acc',
      zaloRefreshToken: 'ref',
      zaloTokenExpiresAt: new Date(0).toISOString(),
    });
    const config = await getZaloConfig(payload);
    expect(payload.findGlobal).toHaveBeenCalledWith({ slug: 'notification-settings' });
    expect(config.enabled).toBe(true);
    expect(config.appId).toBe('app-1');
    expect(config.recipientUserId).toBe('user-1');
  });
});

describe('isConfigComplete', () => {
  it('should be false when the refresh token is missing', () => {
    expect(isConfigComplete(baseConfig({ refreshToken: '' }))).toBe(false);
  });
  it('should be true when all required fields are present', () => {
    expect(isConfigComplete(baseConfig())).toBe(true);
  });
});

describe('getValidAccessToken', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should return the cached token without refreshing when it is still valid', async () => {
    const payload = fakePayload({});
    const token = await getValidAccessToken(payload, baseConfig());
    expect(token).toBe('old-access');
    expect(fetch).not.toHaveBeenCalled();
    expect(payload.updateGlobal).not.toHaveBeenCalled();
  });

  it('should refresh and persist the rotated refresh token when expired', async () => {
    const payload = fakePayload({});
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        expires_in: '90000',
      }),
    });

    const token = await getValidAccessToken(payload, baseConfig({ tokenExpiresAt: 0 }));

    expect(token).toBe('new-access');
    expect(payload.updateGlobal).toHaveBeenCalledOnce();
    const arg = payload.updateGlobal.mock.calls[0][0] as {
      slug: string;
      data: Record<string, unknown>;
    };
    expect(arg.slug).toBe('notification-settings');
    expect(arg.data.zaloAccessToken).toBe('new-access');
    expect(arg.data.zaloRefreshToken).toBe('new-refresh');
  });

  it('should throw when the refresh endpoint returns an error', async () => {
    const payload = fakePayload({});
    (fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ error: -14001, error_description: 'invalid refresh token' }),
    });
    await expect(
      getValidAccessToken(payload, baseConfig({ tokenExpiresAt: 0 })),
    ).rejects.toThrow(/token refresh failed/);
  });
});
