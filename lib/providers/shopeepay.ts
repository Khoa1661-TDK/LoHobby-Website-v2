// lib/providers/shopeepay.ts — ShopeePay / AirPay merchant payment
import { createHmac } from 'node:crypto';
import type {
  CreatePaymentArgs,
  CreatePaymentResult,
  GatewayCredentials,
  PaymentProvider,
  VerifiedWebhook,
  WebhookVerifyContext,
} from '@/lib/payment-provider-types';
import { getWebhookPath } from '@/lib/payment-provider-catalog';

function assertShopeePay(credentials: GatewayCredentials) {
  if (credentials.provider !== 'shopeepay') {
    throw new Error('Invalid credentials for ShopeePay provider');
  }
  return credentials;
}

function shopeePayBaseUrl(sandbox: boolean): string {
  return sandbox
    ? 'https://api.uat.wallet.airpay.vn/v3/merchant/hosted/checkout/payment/create'
    : 'https://api.wallet.airpay.vn/v3/merchant/hosted/checkout/payment/create';
}

function signShopeePay(payload: string, partnerKey: string): string {
  return createHmac('sha256', partnerKey).update(payload).digest('hex');
}

export const shopeepayProvider: PaymentProvider = {
  id: 'shopeepay',
  async createPaymentLink(args, credentials): Promise<CreatePaymentResult> {
    const creds = assertShopeePay(credentials);
    const requestId = `${args.orderCode}-${Date.now()}`;
    const returnUrl = args.returnUrl;
    const notifyUrl = `${args.origin}${getWebhookPath('shopeepay')}`;

    const body = {
      request_id: requestId,
      payment_reference_id: String(args.orderCode),
      merchant_ext_id: creds.merchantExtId,
      store_ext_id: creds.merchantExtId,
      amount: args.amount * 100,
      currency: 'VND',
      return_url: returnUrl,
      platform_type: 'pc',
      additional_info: args.description.slice(0, 255),
      notify_url: notifyUrl,
    };

    const payload = JSON.stringify(body);
    const signature = signShopeePay(payload, creds.partnerKey);

    const res = await fetch(shopeePayBaseUrl(args.sandboxMode), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Airpay-ClientId': creds.partnerCode,
        'X-Airpay-Req-H': signature,
      },
      body: payload,
    });

    const data = (await res.json()) as {
      errcode?: number;
      debug_msg?: string;
      redirect_url_http?: string;
    };

    if (data.errcode !== 0 || !data.redirect_url_http) {
      throw new Error(data.debug_msg ?? 'ShopeePay create payment failed');
    }

    return { checkoutUrl: data.redirect_url_http };
  },
  async verifyWebhook(ctx, credentials): Promise<VerifiedWebhook> {
    const creds = assertShopeePay(credentials);
    const signature = ctx.headers.get('x-airpay-req-h') ?? '';
    const expected = signShopeePay(ctx.rawBody, creds.partnerKey);
    if (signature !== expected) {
      throw new Error('Invalid ShopeePay webhook signature');
    }

    const payload = ctx.body as {
      payment_reference_id?: string;
      amount?: number;
      transaction_status?: number;
    };

    return {
      orderCode: Number(payload.payment_reference_id),
      amount: Math.floor((payload.amount ?? 0) / 100),
      success: payload.transaction_status === 3,
    };
  },
};
