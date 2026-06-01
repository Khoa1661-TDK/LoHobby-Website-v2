// app/api/admin/orders/[docId]/ship/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { assignShipment } from '@/lib/order-fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ docId: string }> },
): Promise<NextResponse> {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ ok: false, message: 'Forbidden' }, { status: 403 });
  }

  const { docId } = await ctx.params;
  const body = (await req.json()) as {
    carrierKey?: string;
    trackingNumber?: string;
    customTrackingUrl?: string | null;
  };

  const result = await assignShipment({
    docId,
    carrierKey: body.carrierKey ?? '',
    trackingNumber: body.trackingNumber ?? '',
    customTrackingUrl: body.customTrackingUrl,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: `Đã giao cho ${result.order.shippingCarrierLabel} — mã ${result.order.trackingNumber}.`,
    order: result.order,
  });
}
