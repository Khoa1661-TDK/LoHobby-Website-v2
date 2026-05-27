// app/api/webhook/route.ts
import { WebhookError } from '@payos/node';
import { NextRequest, NextResponse } from 'next/server';
import { getPayOS, isPayOSWebhook } from '@/lib/payos';
import { prisma } from '@/src/lib/db-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body: unknown = await req.json().catch(() => null);
  if (!isPayOSWebhook(body)) {
    return NextResponse.json({ error: 'Dữ liệu webhook không hợp lệ' }, { status: 400 });
  }

  try {
    const data = await getPayOS().webhooks.verify(body);

    if (!Number.isInteger(data.orderCode) || !Number.isInteger(data.amount)) {
      return NextResponse.json({ error: 'Dữ liệu không đúng định dạng' }, { status: 400 });
    }

    const result = await prisma.order.updateMany({
      where: {
        orderCode: data.orderCode,
        amount: data.amount,
        status: { in: ['PENDING', 'PENDING_ONLINE'] },
      },
      data: { status: 'PAID', paidAt: new Date() },
    });

    return NextResponse.json({ received: true, matched: result.count > 0 });
  } catch (error) {
    if (error instanceof WebhookError) {
      return NextResponse.json({ error: 'Chữ ký không hợp lệ' }, { status: 401 });
    }
    console.error('[payOS webhook]', error);
    return NextResponse.json({ error: 'Xử lý webhook thất bại' }, { status: 500 });
  }
}

// payOS pings GET when registering the webhook URL in the dashboard.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ ok: true });
}
