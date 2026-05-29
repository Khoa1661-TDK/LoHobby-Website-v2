// lib/providers/stripe.ts
import Stripe from 'stripe';
import type {
  CreatePaymentArgs,
  CreatePaymentResult,
  GatewayCredentials,
  PaymentProvider,
  VerifiedWebhook,
  WebhookVerifyContext,
} from '@/lib/payment-provider-types';

function assertStripe(credentials: GatewayCredentials) {
  if (credentials.provider !== 'stripe') {
    throw new Error('Invalid credentials for Stripe provider');
  }
  return credentials;
}

export const stripeProvider: PaymentProvider = {
  id: 'stripe',
  async createPaymentLink(args, credentials): Promise<CreatePaymentResult> {
    const creds = assertStripe(credentials);
    const stripe = new Stripe(creds.secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: args.returnUrl,
      cancel_url: args.cancelUrl,
      client_reference_id: String(args.orderCode),
      metadata: {
        orderCode: String(args.orderCode),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'vnd',
            unit_amount: args.amount,
            product_data: {
              name: args.description.slice(0, 120) || `Order ${args.orderCode}`,
            },
          },
        },
      ],
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL');
    }

    return { checkoutUrl: session.url };
  },
  async verifyWebhook(ctx, credentials): Promise<VerifiedWebhook> {
    const creds = assertStripe(credentials);
    const signature = ctx.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing Stripe-Signature header');
    }

    const stripe = new Stripe(creds.secretKey);
    const event = stripe.webhooks.constructEvent(ctx.rawBody, signature, creds.webhookSecret);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderCode = Number(session.metadata?.orderCode ?? session.client_reference_id);
      const amount = session.amount_total ?? 0;
      return {
        orderCode,
        amount,
        success: session.payment_status === 'paid',
      };
    }

    const session = event.data.object as { metadata?: { orderCode?: string } };
    const orderCode = Number(session.metadata?.orderCode ?? 0);
    return { orderCode, amount: 0, success: false };
  },
};
