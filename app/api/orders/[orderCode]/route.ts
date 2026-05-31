// app/api/orders/[orderCode]/route.ts — poll Payload order payment state
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin-emails';
import { getPayloadOrderByCode } from '@/lib/payload-orders';
import {
  mapPayloadOrderToStorefrontStatus,
  ownsPayloadOrder,
} from '@/lib/payload-order-storefront';

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

  const order = await getPayloadOrderByCode(code);
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

  const status = mapPayloadOrderToStorefrontStatus(order);
  const paidAt =
    typeof order.paidAt === 'string' ? order.paidAt : null;
  const createdAt =
    typeof order.createdAt === 'string' ? order.createdAt : new Date().toISOString();

  return NextResponse.json({
    orderCode: code,
    amount: typeof order.totalAmount === 'number' ? order.totalAmount : 0,
    status,
    paidAt,
    createdAt,
  });
}
