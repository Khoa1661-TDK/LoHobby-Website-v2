// app/api/orders/[orderCode]/tracking/route.ts — shipment tracking for customers (with auto-sync)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin-emails';
import { syncOrderShipment, getPublicShipmentInfo } from '@/lib/order-fulfillment';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import { ownsPayloadOrder } from '@/lib/payload-order-storefront';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipment/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderCode: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Bạn cần đăng nhập.' }, { status: 401 });
  }

  const { orderCode } = await ctx.params;
  const code = Number(orderCode);
  if (!Number.isInteger(code)) {
    return NextResponse.json({ error: 'Mã đơn hàng không hợp lệ' }, { status: 400 });
  }

  let order = await getPayloadOrderByCode(code);
  if (!order) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }

  const isOwner = ownsPayloadOrder(order, {
    userId: session.user.id,
    email: session.user.email,
  });
  const isAdmin = isAdminEmail(session.user.email);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }

  // Auto-sync tracking from carrier before returning to the customer
  if (order.trackingNumber && order.orderStatus === 'shipped') {
    const syncResult = await syncOrderShipment(order.id);
    if (syncResult.ok) {
      const refreshed = await getPayloadOrderByCode(code);
      if (refreshed) order = refreshed;
    }
  }

  const shipment = getPublicShipmentInfo(order);

  return NextResponse.json({
    orderCode: code,
    orderStatus: shipment.orderStatus,
    carrierLabel: shipment.carrierLabel,
    trackingNumber: shipment.trackingNumber,
    trackingUrl: shipment.trackingUrl,
    shipmentStatus: shipment.shipmentStatus,
    shipmentStatusLabel: shipment.shipmentStatus
      ? SHIPMENT_STATUS_LABELS[shipment.shipmentStatus as ShipmentStatus]
      : null,
    shipmentEvents: shipment.shipmentEvents,
    shippedAt: shipment.shippedAt,
    deliveredAt: shipment.deliveredAt,
  });
}
