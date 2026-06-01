// app/api/admin/orders/[docId]/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { syncOrderShipment } from '@/lib/order-fulfillment';

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
  const result = await syncOrderShipment(docId);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  const message =
    result.order.shipmentStatus === 'delivered'
      ? 'Đơn hàng đã được tự động hoàn tất (đã giao).'
      : `Trạng thái vận chuyển: ${result.order.shipmentStatus ?? '—'}`;

  return NextResponse.json({ ok: true, message, order: result.order });
}
