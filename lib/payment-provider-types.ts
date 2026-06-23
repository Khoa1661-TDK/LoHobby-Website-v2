// lib/payment-provider-types.ts — shared types for gateway integrations.
import type { PaymentProviderId } from '@/lib/payment-provider-catalog';

export type CreatePaymentArgs = {
  orderCode: number;
  amount: number;
  description: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  returnUrl: string;
  cancelUrl: string;
  /** Site origin, e.g. https://example.com — used to build webhook URLs. */
  origin: string;
  sandboxMode: boolean;
};

export type CreatePaymentResult = {
  checkoutUrl: string;
  qrCode?: string;
};

export type VerifiedWebhook = {
  orderCode: number;
  amount: number;
  success: boolean;
};

export type WebhookVerifyContext = {
  body: unknown;
  rawBody: string;
  headers: Headers;
};

export type PayOSCredentials = {
  provider: 'payos';
  clientId: string;
  apiKey: string;
  checksumKey: string;
};

export type StripeCredentials = {
  provider: 'stripe';
  secretKey: string;
  webhookSecret: string;
};

export type MoMoCredentials = {
  provider: 'momo';
  partnerCode: string;
  accessKey: string;
  secretKey: string;
};

export type ZaloPayCredentials = {
  provider: 'zalopay';
  appId: string;
  key1: string;
  key2: string;
};

export type VNPayCredentials = {
  provider: 'vnpay';
  tmnCode: string;
  hashSecret: string;
};

export type ShopeePayCredentials = {
  provider: 'shopeepay';
  partnerCode: string;
  partnerKey: string;
  merchantExtId: string;
};

export type DemoCredentials = {
  provider: 'demo';
};

export type GatewayCredentials =
  | PayOSCredentials
  | StripeCredentials
  | MoMoCredentials
  | ZaloPayCredentials
  | VNPayCredentials
  | ShopeePayCredentials
  | DemoCredentials;

export type PaymentProvider = {
  id: PaymentProviderId;
  createPaymentLink(
    args: CreatePaymentArgs,
    credentials: GatewayCredentials,
  ): Promise<CreatePaymentResult>;
  verifyWebhook(
    ctx: WebhookVerifyContext,
    credentials: GatewayCredentials,
  ): Promise<VerifiedWebhook>;
};
