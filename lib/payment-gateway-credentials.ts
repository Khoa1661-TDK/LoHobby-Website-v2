// lib/payment-gateway-credentials.ts — server-only resolution of gateway secrets.
import config from '@payload-config';
import { getPayload } from 'payload';
import {
  PAYMENT_PROVIDER_CATALOG,
  type PaymentProviderId,
  isPaymentProviderId,
} from '@/lib/payment-provider-catalog';
import type { GatewayCredentials } from '@/lib/payment-provider-types';
import { decryptCredentials } from '@/lib/payment-secrets';

type StoredCredentialBlob = Record<string, unknown> & { provider?: string };

type MethodDoc = {
  provider?: string | null;
  gatewayCredentials?: {
    credentialsEnc?: string | null;
    sandboxMode?: boolean | null;
  } | null;
};

function readEnv(name: string): string | null {
  const value = process.env[name];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function credentialsFromEnv(provider: PaymentProviderId): GatewayCredentials | null {
  const def = PAYMENT_PROVIDER_CATALOG[provider];
  if (!def.envFallback) return null;

  const values = def.envFallback.map(readEnv);
  if (values.some((value) => !value)) return null;

  const fields = Object.fromEntries(
    def.requiredFields.map((field, index) => [field, values[index] as string]),
  );

  return { provider, ...fields } as GatewayCredentials;
}

function credentialsFromBlob(
  provider: PaymentProviderId,
  blob: StoredCredentialBlob,
): GatewayCredentials | null {
  if (blob.provider !== provider) return null;

  const def = PAYMENT_PROVIDER_CATALOG[provider];
  const values = def.requiredFields.map((field) => {
    const value = blob[field];
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  });

  if (values.some((value) => !value)) return null;
  const fields = Object.fromEntries(def.requiredFields.map((field, index) => [field, values[index] as string]));
  return { provider, ...fields } as GatewayCredentials;
}

export type ResolvedGatewayConfig = {
  credentials: GatewayCredentials;
  sandboxMode: boolean;
};

/**
 * Resolve decrypted gateway credentials (+ sandbox flag) for a payment method key.
 *
 * Order of precedence:
 *   1. Encrypted credentials stored on the CMS method.
 *   2. Provider-specific environment variables.
 *   3. null when nothing is configured.
 */
export async function getGatewayConfigForMethod(
  paymentMethodKey: string,
): Promise<ResolvedGatewayConfig | null> {
  const key = paymentMethodKey.trim();
  if (!key) return null;

  let doc: MethodDoc | undefined;

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'payment-methods',
      where: { key: { equals: key } },
      limit: 1,
      pagination: false,
      depth: 0,
      overrideAccess: true,
      context: { exposePaymentSecrets: true },
    });
    doc = result.docs[0] as MethodDoc | undefined;
  } catch (error) {
    console.warn('[payment-gateway-credentials] lookup failed; trying env fallback.', error);
  }

  const providerRaw = doc?.provider;
  const provider = isPaymentProviderId(providerRaw) ? providerRaw : null;
  const sandboxMode = doc?.gatewayCredentials?.sandboxMode !== false;
  const credentialsEnc = doc?.gatewayCredentials?.credentialsEnc;

  if (provider && typeof credentialsEnc === 'string' && credentialsEnc.length > 0) {
    const decrypted = decryptCredentials<StoredCredentialBlob>(credentialsEnc);
    const fromBlob = decrypted ? credentialsFromBlob(provider, decrypted) : null;
    if (fromBlob) {
      return { credentials: fromBlob, sandboxMode };
    }
    console.error('[payment-gateway-credentials] stored credentials could not be decrypted.');
  }

  if (provider) {
    const fromEnv = credentialsFromEnv(provider);
    if (fromEnv) {
      return { credentials: fromEnv, sandboxMode };
    }
  }

  // Legacy payOS fallback when method key is "payos" but provider field missing.
  if (key === 'payos') {
    const fromEnv = credentialsFromEnv('payos');
    if (fromEnv) return { credentials: fromEnv, sandboxMode };
  }

  return null;
}
