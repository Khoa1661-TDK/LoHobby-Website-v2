// lib/payment-provider-catalog.ts — shared provider metadata (no SDK imports).
//
// Single source of truth for provider IDs, labels, and CMS credential fields.
// Imported by the Payload collection config and the server-side provider registry.

export const PAYMENT_PROVIDER_IDS = [
  'payos',
  'stripe',
  'momo',
  'zalopay',
  'vnpay',
  'shopeepay',
  'demo',
] as const;

export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];

export function isPaymentProviderId(value: unknown): value is PaymentProviderId {
  return typeof value === 'string' && (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value);
}

/** All credential input field names used across providers. */
export const GATEWAY_CREDENTIAL_FIELD_NAMES = [
  'clientId',
  'apiKey',
  'checksumKey',
  'secretKey',
  'webhookSecret',
  'partnerCode',
  'accessKey',
  'partnerKey',
  'merchantExtId',
  'appId',
  'key1',
  'key2',
  'tmnCode',
  'hashSecret',
] as const;

export type GatewayCredentialFieldName = (typeof GATEWAY_CREDENTIAL_FIELD_NAMES)[number];

type ProviderDefinition = {
  label: string;
  /** Credential fields required when saving keys in the CMS. */
  requiredFields: readonly GatewayCredentialFieldName[];
  /** Optional env var names used as fallback (same order as requiredFields where applicable). */
  envFallback?: readonly string[];
};

export const PAYMENT_PROVIDER_CATALOG: Record<PaymentProviderId, ProviderDefinition> = {
  payos: {
    label: 'payOS (VietQR)',
    requiredFields: ['clientId', 'apiKey', 'checksumKey'],
    envFallback: ['PAYOS_CLIENT_ID', 'PAYOS_API_KEY', 'PAYOS_CHECKSUM_KEY'],
  },
  stripe: {
    label: 'Stripe (Thẻ quốc tế)',
    requiredFields: ['secretKey', 'webhookSecret'],
    envFallback: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  },
  momo: {
    label: 'MoMo',
    requiredFields: ['partnerCode', 'accessKey', 'secretKey'],
    envFallback: ['MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY'],
  },
  zalopay: {
    label: 'ZaloPay',
    requiredFields: ['appId', 'key1', 'key2'],
    envFallback: ['ZALOPAY_APP_ID', 'ZALOPAY_KEY1', 'ZALOPAY_KEY2'],
  },
  vnpay: {
    label: 'VNPay',
    requiredFields: ['tmnCode', 'hashSecret'],
    envFallback: ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET'],
  },
  shopeepay: {
    label: 'ShopeePay',
    requiredFields: ['partnerCode', 'partnerKey', 'merchantExtId'],
    envFallback: ['SHOPEEPAY_PARTNER_CODE', 'SHOPEEPAY_PARTNER_KEY', 'SHOPEEPAY_MERCHANT_EXT_ID'],
  },
  demo: {
    label: 'Demo / Test (no real payment)',
    requiredFields: [],
  },
};

export const PAYMENT_PROVIDER_OPTIONS = PAYMENT_PROVIDER_IDS.map((id) => ({
  label: PAYMENT_PROVIDER_CATALOG[id].label,
  value: id,
}));

/** Human-readable labels for CMS credential inputs. */
export const CREDENTIAL_FIELD_LABELS: Record<GatewayCredentialFieldName, string> = {
  clientId: 'Client ID',
  apiKey: 'API Key',
  checksumKey: 'Checksum Key',
  secretKey: 'Secret Key',
  webhookSecret: 'Webhook Secret',
  partnerCode: 'Partner Code',
  accessKey: 'Access Key',
  partnerKey: 'Partner Key',
  merchantExtId: 'Merchant Ext ID',
  appId: 'App ID',
  key1: 'Key 1 (MAC)',
  key2: 'Key 2 (Callback)',
  tmnCode: 'TMN Code',
  hashSecret: 'Hash Secret',
};

export function providerUsesCredentialField(
  provider: PaymentProviderId,
  field: GatewayCredentialFieldName,
): boolean {
  return PAYMENT_PROVIDER_CATALOG[provider].requiredFields.includes(field);
}

export function getWebhookPath(provider: PaymentProviderId): string {
  return `/api/webhook/${provider}`;
}
