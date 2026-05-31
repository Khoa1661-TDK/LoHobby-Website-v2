// app/api/webhook/[provider]/route.ts — provider-specific payment webhooks.
import { WebhookError } from '@payos/node';
import { NextRequest, NextResponse } from 'next/server';
import { getGatewayConfigForMethod } from '@/lib/payment-gateway-credentials';
import {
  credentialsForProvider,
  getPaymentProvider,
  isPaymentProviderId,
  type PaymentProviderId,
} from '@/lib/payment-providers';
import { applyVerifiedWebhookPayment } from '@/lib/payment-webhook-handler';
import { getPayloadOrderByCode } from '@/lib/payload-orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ provider: string }> };

function extractOrderCode(provider: PaymentProviderId, body: unknown): number | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as Record<string, unknown>;

  switch (provider) {
    case 'payos': {
      const data = record.data as Record<string, unknown> | undefined;
      const code = data?.orderCode;
      return typeof code === 'number' ? code : null;
    }
    case 'momo':
      return typeof record.orderId === 'string' ? Number(record.orderId) : null;
    case 'zalopay': {
      if (typeof record.data !== 'string') return null;
      try {
        const parsed = JSON.parse(record.data) as { app_trans_id?: string };
        return Number(String(parsed.app_trans_id ?? '').split('_').pop());
      } catch {
        return null;
      }
    }
    case 'vnpay':
      return typeof record.vnp_TxnRef === 'string' ? Number(record.vnp_TxnRef) : null;
    case 'shopeepay':
      return typeof record.payment_reference_id === 'string'
        ? Number(record.payment_reference_id)
        : null;
    case 'stripe':
      return null;
    default:
      return null;
  }
}

async function resolveMethodKey(
  provider: PaymentProviderId,
  orderCode: number | null,
): Promise<string> {
  if (orderCode !== null && Number.isInteger(orderCode)) {
    const order = await getPayloadOrderByCode(orderCode);
    if (typeof order?.paymentMethodKey === 'string' && order.paymentMethodKey.length > 0) {
      return order.paymentMethodKey;
    }
  }
  return provider;
}

async function handleWebhook(
  provider: PaymentProviderId,
  body: unknown,
  rawBody: string,
  headers: Headers,
): Promise<NextResponse> {
  const paymentProvider = getPaymentProvider(provider);
  if (!paymentProvider) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  let orderCode = extractOrderCode(provider, body);

  // Stripe: read tentative orderCode from unsigned JSON, then verify with that method's keys.
  if (provider === 'stripe') {
    let tentativeOrderCode: number | null = null;
    try {
      const parsed = JSON.parse(rawBody) as {
        data?: { object?: { metadata?: { orderCode?: string }; client_reference_id?: string } };
      };
      tentativeOrderCode = Number(
        parsed.data?.object?.metadata?.orderCode ?? parsed.data?.object?.client_reference_id,
      );
    } catch {
      tentativeOrderCode = null;
    }

    const methodKey = await resolveMethodKey(provider, tentativeOrderCode);
    const config = await getGatewayConfigForMethod(methodKey);
    if (!config || config.credentials.provider !== 'stripe') {
      return NextResponse.json({ error: 'Stripe chưa được cấu hình' }, { status: 500 });
    }
    try {
      const data = await paymentProvider.verifyWebhook(
        { body, rawBody, headers },
        credentialsForProvider('stripe', config.credentials),
      );
      const result = await applyVerifiedWebhookPayment(data);
      return NextResponse.json({ received: true, matched: result.matched });
    } catch (error) {
      console.error('[stripe webhook]', error);
      return NextResponse.json({ error: 'Chữ ký không hợp lệ' }, { status: 401 });
    }
  }

  if (orderCode === null || !Number.isInteger(orderCode)) {
    return NextResponse.json({ error: 'Dữ liệu webhook không hợp lệ' }, { status: 400 });
  }

  const methodKey = await resolveMethodKey(provider, orderCode);
  const config = await getGatewayConfigForMethod(methodKey);
  if (!config || config.credentials.provider !== provider) {
    return NextResponse.json({ error: 'Cổng thanh toán chưa được cấu hình' }, { status: 500 });
  }

  try {
    const data = await paymentProvider.verifyWebhook(
      { body, rawBody, headers },
      credentialsForProvider(provider, config.credentials),
    );

    if (!data.success) {
      return NextResponse.json({
        received: true,
        matched: false,
        reason: 'non-success settlement',
      });
    }

    const result = await applyVerifiedWebhookPayment(data);
    return NextResponse.json({ received: true, matched: result.matched });
  } catch (error) {
    if (error instanceof WebhookError) {
      return NextResponse.json({ error: 'Chữ ký không hợp lệ' }, { status: 401 });
    }
    console.error(`[${provider} webhook]`, error);
    return NextResponse.json({ error: 'Xử lý webhook thất bại' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { provider: providerParam } = await context.params;
  if (!isPaymentProviderId(providerParam)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  const rawBody = await req.text();
  let body: unknown = null;
  if (rawBody.length > 0) {
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      body = Object.fromEntries(new URLSearchParams(rawBody));
    }
  }

  return handleWebhook(providerParam, body, rawBody, req.headers);
}

/** VNPay IPN uses GET query parameters. */
export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const { provider: providerParam } = await context.params;
  if (!isPaymentProviderId(providerParam)) {
    return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  }

  if (providerParam === 'vnpay') {
    const body = Object.fromEntries(req.nextUrl.searchParams.entries());
    return handleWebhook('vnpay', body, req.nextUrl.search, req.headers);
  }

  return NextResponse.json({ ok: true });
}
