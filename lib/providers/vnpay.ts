// lib/providers/vnpay.ts — VNPay payment URL generation
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

function assertVNPay(credentials: GatewayCredentials) {
  if (credentials.provider !== 'vnpay') {
    throw new Error('Invalid credentials for VNPay provider');
  }
  return credentials;
}

function vnpayBaseUrl(sandbox: boolean): string {
  return sandbox
    ? 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
    : 'https://vnpayment.vn/paymentv2/vpcpay.html';
}

function sortQuery(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key] ?? '')}`)
    .join('&');
}

export const vnpayProvider: PaymentProvider = {
  id: 'vnpay',
  async createPaymentLink(args, credentials): Promise<CreatePaymentResult> {
    const creds = assertVNPay(credentials);
    const createDate = new Date()
      .toISOString()
      // Alternation, not a character class, on purpose: the Tailwind source scanner
      // (lib is in its content globs) reads a bracketed regex of these chars as an
      // arbitrary-property class candidate and emits invalid CSS that breaks the whole
      // stylesheet. Same effect — strips the ISO separators to leave yyyymmddHHMMSS.
      .replace(/-|:|T|Z|\./g, '')
      .slice(0, 14);

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: creds.tmnCode,
      vnp_Amount: String(args.amount * 100),
      vnp_CurrCode: 'VND',
      vnp_TxnRef: String(args.orderCode),
      vnp_OrderInfo: args.description.slice(0, 255),
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl: args.returnUrl,
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    const signData = sortQuery(params);
    const secureHash = createHmac('sha512', creds.hashSecret).update(signData).digest('hex');
    const checkoutUrl = `${vnpayBaseUrl(args.sandboxMode)}?${signData}&vnp_SecureHash=${secureHash}`;

    return { checkoutUrl };
  },
  async verifyWebhook(ctx, credentials): Promise<VerifiedWebhook> {
    const creds = assertVNPay(credentials);
    const query = ctx.body as Record<string, string>;
    const secureHash = query.vnp_SecureHash;
    const params = { ...query };
    delete params.vnp_SecureHash;
    delete params.vnp_SecureHashType;

    const signData = Object.keys(params)
      .sort()
      .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key] ?? '')}`)
      .join('&');

    const expected = createHmac('sha512', creds.hashSecret).update(signData).digest('hex');
    if (secureHash !== expected) {
      throw new Error('Invalid VNPay secure hash');
    }

    const orderCode = Number(query.vnp_TxnRef);
    const amount = Math.floor(Number(query.vnp_Amount ?? 0) / 100);
    const responseCode = query.vnp_ResponseCode;

    return {
      orderCode,
      amount,
      success: responseCode === '00',
    };
  },
};
