// lib/providers/momo.ts — MoMo Payment Gateway v2
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

function assertMoMo(credentials: GatewayCredentials) {
  if (credentials.provider !== 'momo') {
    throw new Error('Invalid credentials for MoMo provider');
  }
  return credentials;
}

function momoBaseUrl(sandbox: boolean): string {
  return sandbox
    ? 'https://test-payment.momo.vn/v2/gateway/api'
    : 'https://payment.momo.vn/v2/gateway/api';
}

function signMoMo(raw: string, secretKey: string): string {
  return createHmac('sha256', secretKey).update(raw).digest('hex');
}

export const momoProvider: PaymentProvider = {
  id: 'momo',
  async createPaymentLink(args, credentials): Promise<CreatePaymentResult> {
    const creds = assertMoMo(credentials);
    const requestId = `${args.orderCode}-${Date.now()}`;
    const orderId = String(args.orderCode);
    const requestType = 'captureWallet';
    const extraData = '';
    const ipnUrl = `${args.origin}${getWebhookPath('momo')}`;
    const redirectUrl = args.returnUrl;
    const orderInfo = args.description.slice(0, 255);

    const rawSignature = [
      `accessKey=${creds.accessKey}`,
      `amount=${args.amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${creds.partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');

    const body = {
      partnerCode: creds.partnerCode,
      partnerName: 'Store',
      storeId: creds.partnerCode,
      requestId,
      amount: args.amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      autoCapture: true,
      extraData,
      signature: signMoMo(rawSignature, creds.secretKey),
    };

    const res = await fetch(`${momoBaseUrl(args.sandboxMode)}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      resultCode?: number;
      message?: string;
      payUrl?: string;
      deeplink?: string;
      qrCodeUrl?: string;
    };

    if (data.resultCode !== 0 || !data.payUrl) {
      throw new Error(data.message ?? 'MoMo create payment failed');
    }

    return { checkoutUrl: data.payUrl, qrCode: data.qrCodeUrl };
  },
  async verifyWebhook(ctx, credentials): Promise<VerifiedWebhook> {
    const creds = assertMoMo(credentials);
    const payload = ctx.body as Record<string, unknown>;
    const orderId = typeof payload.orderId === 'string' ? payload.orderId : '';
    const amount = typeof payload.amount === 'number' ? payload.amount : 0;
    const resultCode = typeof payload.resultCode === 'number' ? payload.resultCode : -1;
    const signature = typeof payload.signature === 'string' ? payload.signature : '';

    const rawSignature = [
      `accessKey=${creds.accessKey}`,
      `amount=${amount}`,
      `extraData=${payload.extraData ?? ''}`,
      `message=${payload.message ?? ''}`,
      `orderId=${orderId}`,
      `orderInfo=${payload.orderInfo ?? ''}`,
      `orderType=${payload.orderType ?? ''}`,
      `partnerCode=${creds.partnerCode}`,
      `payType=${payload.payType ?? ''}`,
      `requestId=${payload.requestId ?? ''}`,
      `responseTime=${payload.responseTime ?? ''}`,
      `resultCode=${resultCode}`,
      `transId=${payload.transId ?? ''}`,
    ].join('&');

    const expected = signMoMo(rawSignature, creds.secretKey);
    if (signature !== expected) {
      throw new Error('Invalid MoMo webhook signature');
    }

    return {
      orderCode: Number(orderId),
      amount,
      success: resultCode === 0,
    };
  },
};
