// lib/payment-providers.ts — server-only registry of automated payment gateways.
import type { PaymentProviderId } from '@/lib/payment-provider-catalog';
import { isPaymentProviderId } from '@/lib/payment-provider-catalog';
import type { GatewayCredentials, PaymentProvider } from '@/lib/payment-provider-types';
import { demoProvider } from '@/lib/providers/demo';
import { momoProvider } from '@/lib/providers/momo';
import { payosProvider } from '@/lib/providers/payos';
import { shopeepayProvider } from '@/lib/providers/shopeepay';
import { stripeProvider } from '@/lib/providers/stripe';
import { vnpayProvider } from '@/lib/providers/vnpay';
import { zalopayProvider } from '@/lib/providers/zalopay';

export type {
  CreatePaymentArgs,
  CreatePaymentResult,
  GatewayCredentials,
  PaymentProvider,
  VerifiedWebhook,
  WebhookVerifyContext,
} from '@/lib/payment-provider-types';

export {
  PAYMENT_PROVIDER_CATALOG,
  PAYMENT_PROVIDER_IDS,
  PAYMENT_PROVIDER_OPTIONS,
  getWebhookPath,
  isPaymentProviderId,
} from '@/lib/payment-provider-catalog';
export type { PaymentProviderId } from '@/lib/payment-provider-catalog';

const REGISTRY: Record<PaymentProviderId, PaymentProvider> = {
  payos: payosProvider,
  stripe: stripeProvider,
  momo: momoProvider,
  zalopay: zalopayProvider,
  vnpay: vnpayProvider,
  shopeepay: shopeepayProvider,
  demo: demoProvider,
};

export function getPaymentProvider(id: string): PaymentProvider | null {
  return isPaymentProviderId(id) ? REGISTRY[id] : null;
}

/** Narrow credentials to the provider implementation selected on the method. */
export function credentialsForProvider(
  providerId: PaymentProviderId,
  credentials: GatewayCredentials,
): GatewayCredentials {
  if (credentials.provider !== providerId) {
    throw new Error(`Credential provider mismatch: expected ${providerId}`);
  }
  return credentials;
}
