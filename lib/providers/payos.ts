// lib/providers/payos.ts
import { getPayOS, isPayOSPaymentSuccess } from '@/lib/payos';
import type {
  CreatePaymentArgs,
  CreatePaymentResult,
  GatewayCredentials,
  PaymentProvider,
  VerifiedWebhook,
  WebhookVerifyContext,
} from '@/lib/payment-provider-types';

function assertPayOS(credentials: GatewayCredentials) {
  if (credentials.provider !== 'payos') {
    throw new Error('Invalid credentials for payOS provider');
  }
  return credentials;
}

export const payosProvider: PaymentProvider = {
  id: 'payos',
  async createPaymentLink(args, credentials): Promise<CreatePaymentResult> {
    const creds = assertPayOS(credentials);
    const payos = getPayOS({
      clientId: creds.clientId,
      apiKey: creds.apiKey,
      checksumKey: creds.checksumKey,
    });
    const payment = await payos.paymentRequests.create({
      orderCode: args.orderCode,
      amount: args.amount,
      description: args.description.slice(0, 25),
      items: args.items.map((item) => ({
        name: item.name.slice(0, 25),
        quantity: item.quantity,
        price: item.price,
      })),
      returnUrl: args.returnUrl,
      cancelUrl: args.cancelUrl,
    });
    return { checkoutUrl: payment.checkoutUrl, qrCode: payment.qrCode };
  },
  async verifyWebhook(ctx, credentials): Promise<VerifiedWebhook> {
    const creds = assertPayOS(credentials);
    const payos = getPayOS({
      clientId: creds.clientId,
      apiKey: creds.apiKey,
      checksumKey: creds.checksumKey,
    });
    const data = await payos.webhooks.verify(
      ctx.body as Parameters<typeof payos.webhooks.verify>[0],
    );
    return {
      orderCode: data.orderCode,
      amount: data.amount,
      success: isPayOSPaymentSuccess(data),
    };
  },
};
