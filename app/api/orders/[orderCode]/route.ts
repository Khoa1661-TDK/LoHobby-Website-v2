// app/api/orders/[orderCode]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderCode: string }> },
): Promise<NextResponse> {
  const { orderCode } = await ctx.params;
  const code = Number(orderCode);
  if (!Number.isInteger(code)) {
    return NextResponse.json({ error: 'Invalid orderCode' }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { orderCode: code },
    select: {
      orderCode: true,
      amount: true,
      status: true,
      paidAt: true,
      createdAt: true,
    },
  });
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(order);
}
