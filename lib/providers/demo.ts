// lib/providers/demo.ts — no-charge gateway for verifying the checkout happy path.
// createPaymentLink returns an INTERNAL gate URL; the gate confirms via
// /api/checkout/demo/confirm, which reuses applyVerifiedWebhookPayment. This
// provider intentionally never touches an external API and has no webhook.
import type {
  CreatePaymentResult,
  GatewayCredentials,
  PaymentProvider,
} from '@/lib/payment-provider-types';

function assertDemo(credentials: GatewayCredentials) {
  if (credentials.provider !== 'demo') {
    throw new Error('Invalid credentials for demo provider');
  }
  return credentials;
}

export const demoProvider: PaymentProvider = {
  id: 'demo',
  async createPaymentLink(args, credentials): Promise<CreatePaymentResult> {
    assertDemo(credentials);
    // Non-locale-prefixed path mirrors the real returnUrl convention; next-intl
    // middleware adds the active locale prefix on navigation.
    return {
      checkoutUrl: `${args.origin}/checkout/demo?orderCode=${args.orderCode}`,
    };
  },
  async verifyWebhook() {
    throw new Error('demo provider has no external webhook');
  },
};
