// lib/providers/zalopay.ts — ZaloPay create order API
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

function assertZaloPay(credentials: GatewayCredentials) {
  if (credentials.provider !== 'zalopay') {
    throw new Error('Invalid credentials for ZaloPay provider');
  }
  return credentials;
}

function zaloPayBaseUrl(sandbox: boolean): string {
  return sandbox
    ? 'https://sb-openapi.zalopay.vn/v2/create'
    : 'https://openapi.zalopay.vn/v2/create';
}

function zaloPayCallbackBase(sandbox: boolean): string {
  return sandbox
    ? 'https://sb-openapi.zalopay.vn/v2/verify'
    : 'https://openapi.zalopay.vn/v2/verify';
}

function formatAppTransId(orderCode: number): string {
  const now = new Date();
  const yymmdd = [
    String(now.getFullYear()).slice(-2),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  return `${yymmdd}_${orderCode}`;
}

export const zalopayProvider: PaymentProvider = {
  id: 'zalopay',
  async createPaymentLink(args, credentials): Promise<CreatePaymentResult> {
    const creds = assertZaloPay(credentials);
    const appTransId = formatAppTransId(args.orderCode);
    const appTime = Date.now();
    const embedData = JSON.stringify({
      redirecturl: args.returnUrl,
      callbackurl: `${args.origin}${getWebhookPath('zalopay')}`,
    });
    const item = JSON.stringify([{ itemid: String(args.orderCode), itemname: args.description, itemprice: args.amount, itemquantity: 1 }]);
    const appUser = 'store';

    const macData = [
      creds.appId,
      appTransId,
      appUser,
      args.amount,
      appTime,
      embedData,
      item,
    ].join('|');
    const mac = createHmac('sha256', creds.key1).update(macData).digest('hex');

    const res = await fetch(zaloPayBaseUrl(args.sandboxMode), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        app_id: creds.appId,
        app_user: appUser,
        app_time: String(appTime),
        amount: String(args.amount),
        app_trans_id: appTransId,
        embed_data: embedData,
        item,
        description: args.description.slice(0, 127),
        mac,
      }),
    });

    const data = (await res.json()) as {
      return_code?: number;
      return_message?: string;
      order_url?: string;
      zp_trans_token?: string;
    };

    if (data.return_code !== 1 || !data.order_url) {
      throw new Error(data.return_message ?? 'ZaloPay create order failed');
    }

    return { checkoutUrl: data.order_url };
  },
  async verifyWebhook(ctx, credentials): Promise<VerifiedWebhook> {
    const creds = assertZaloPay(credentials);
    const payload = ctx.body as Record<string, unknown>;
    const dataStr = typeof payload.data === 'string' ? payload.data : '';
    const mac = typeof payload.mac === 'string' ? payload.mac : '';

    const expectedMac = createHmac('sha256', creds.key2).update(dataStr).digest('hex');
    if (mac !== expectedMac) {
      throw new Error('Invalid ZaloPay callback MAC');
    }

    const data = JSON.parse(dataStr) as {
      app_trans_id?: string;
      amount?: number;
      status?: number;
    };

    const orderCode = Number(String(data.app_trans_id ?? '').split('_').pop());
    return {
      orderCode,
      amount: data.amount ?? 0,
      success: data.status === 1,
    };
  },
};
