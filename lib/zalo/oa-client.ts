// lib/zalo/oa-client.ts — Zalo Official Account token management + consultation message send
import type { Payload } from 'payload';

const TOKEN_URL = 'https://oauth.zaloapp.com/v4/oa/access_token';
const MESSAGE_URL = 'https://openapi.zalo.me/v3.0/oa/message/cs';
const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh shortly before expiry

export interface ZaloOaConfig {
  enabled: boolean;
  appId: string;
  appSecret: string;
  recipientUserId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number; // epoch ms; 0 = unknown/expired
}

interface NotificationGlobalShape {
  zaloEnabled?: boolean | null;
  zaloAppId?: string | null;
  zaloAppSecret?: string | null;
  zaloRecipientUserId?: string | null;
  zaloAccessToken?: string | null;
  zaloRefreshToken?: string | null;
  zaloTokenExpiresAt?: string | null;
}

export async function getZaloConfig(payload: Payload): Promise<ZaloOaConfig> {
  const g = (await payload.findGlobal({
    slug: 'notification-settings',
  })) as NotificationGlobalShape;
  return {
    enabled: Boolean(g.zaloEnabled),
    appId: g.zaloAppId ?? '',
    appSecret: g.zaloAppSecret ?? '',
    recipientUserId: g.zaloRecipientUserId ?? '',
    accessToken: g.zaloAccessToken ?? '',
    refreshToken: g.zaloRefreshToken ?? '',
    tokenExpiresAt: g.zaloTokenExpiresAt ? Date.parse(g.zaloTokenExpiresAt) : 0,
  };
}

export function isConfigComplete(config: ZaloOaConfig): boolean {
  return Boolean(
    config.appId && config.appSecret && config.recipientUserId && config.refreshToken,
  );
}

let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(payload: Payload, config: ZaloOaConfig): Promise<string> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const body = new URLSearchParams({
      refresh_token: config.refreshToken,
      app_id: config.appId,
      grant_type: 'refresh_token',
    });
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        secret_key: config.appSecret,
      },
      body,
    });
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: string | number;
      error?: number;
      error_description?: string;
    };
    if (!res.ok || !json.access_token || !json.refresh_token) {
      throw new Error(`[zalo] token refresh failed: ${json.error_description ?? res.status}`);
    }
    const expiresAt = Date.now() + Number(json.expires_in ?? 0) * 1000;
    // The old refresh token is now invalid — persist the rotated pair.
    await payload.updateGlobal({
      slug: 'notification-settings',
      data: {
        zaloAccessToken: json.access_token,
        zaloRefreshToken: json.refresh_token,
        zaloTokenExpiresAt: new Date(expiresAt).toISOString(),
      },
    });
    return json.access_token;
  })();
  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

export async function getValidAccessToken(
  payload: Payload,
  config: ZaloOaConfig,
): Promise<string> {
  const stillValid =
    config.accessToken && config.tokenExpiresAt - Date.now() > REFRESH_MARGIN_MS;
  if (stillValid) return config.accessToken;
  return refreshAccessToken(payload, config);
}

export async function sendOaMessage(
  payload: Payload,
  config: ZaloOaConfig,
  text: string,
): Promise<void> {
  const accessToken = await getValidAccessToken(payload, config);
  const res = await fetch(MESSAGE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', access_token: accessToken },
    body: JSON.stringify({ recipient: { user_id: config.recipientUserId }, message: { text } }),
  });
  const json = (await res.json()) as { error?: number; message?: string };
  if (!res.ok || (json.error !== undefined && json.error !== 0)) {
    throw new Error(`[zalo] send failed: ${json.message ?? res.status}`);
  }
}
