// app/api/admin/orders/[docId]/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { confirmOrder } from '@/lib/order-fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ docId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
  }

  const { docId } = await ctx.params;
  const result = await confirmOrder(docId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: `Đã xác nhận đơn #${result.order.orderCode}.`,
    order: result.order,
  });
}
