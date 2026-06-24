// app/api/checkout/demo/confirm/route.ts — confirms a demo/test payment.
// Runs the SAME paid transition real gateway webhooks use, with no external call.
// Hard-guarded so it can never settle a real customer's order in production.
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { enforceRateLimit } from '@/lib/api-guard';
import { RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
import { isDemoPaymentAllowed } from '@/lib/feature-flags';
import { isAdminEmail } from '@/lib/admin-emails';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import { getPaymentMethodByKey } from '@/lib/payment-methods';
import {
  mapPayloadOrderToStorefrontStatus,
  ownsPayloadOrder,
} from '@/lib/payload-order-storefront';
import { applyVerifiedWebhookPayment } from '@/lib/payment-webhook-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const limited = enforceRateLimit(req, 'checkout', RATE_LIMIT_PRESETS.checkout);
  if (limited) return limited;

  if (!isDemoPaymentAllowed()) {
    return NextResponse.json({ error: 'Demo payments are disabled.' }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
  const orderCode = Number((body as { orderCode?: unknown })?.orderCode);
  if (!Number.isInteger(orderCode)) {
    return NextResponse.json({ error: 'Invalid order code' }, { status: 400 });
  }

  const order = await getPayloadOrderByCode(orderCode);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const isOwner = ownsPayloadOrder(order, {
    userId: session.user.id,
    email: session.user.email,
  });
  if (!isOwner && !isAdminEmail(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const method = order.paymentMethodKey
    ? await getPaymentMethodByKey(order.paymentMethodKey)
    : null;
  if (method?.provider !== 'demo') {
    return NextResponse.json({ error: 'Not a demo order' }, { status: 400 });
  }

  // Already settled — idempotent success (the buyer may have double-clicked).
  if (mapPayloadOrderToStorefrontStatus(order) === 'PAID') {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const amount = typeof order.totalAmount === 'number' ? order.totalAmount : 0;
  await applyVerifiedWebhookPayment({ orderCode, amount, success: true });

  return NextResponse.json({ success: true }, { status: 200 });
}
