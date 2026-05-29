// app/api/orders/[orderCode]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminEmail } from '@/lib/admin-emails';
import { prisma } from '@/src/lib/db-adapter';

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

  const order = await prisma.order.findUnique({
    where: { orderCode: code },
    select: {
      orderCode: true,
      userId: true,
      amount: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  });
  // Always respond 404 for "not found" or "not yours" — never confirm a
  // foreign order's existence to an unrelated user.
  if (!order) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }

  const isOwner = order.userId === session.user.id;
  const isAdmin = isAdminEmail(session.user.email);
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }

  const { userId: _userId, ...safe } = order;
  return NextResponse.json(safe);
}
