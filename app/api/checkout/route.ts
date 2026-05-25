// app/api/checkout/route.ts
import { PayOSError } from '@payos/node';
import { NextRequest, NextResponse } from 'next/server';
import {
  allocateOrderCode,
  getPayOS,
  isUniqueConstraintError,
} from '@/lib/payos';
import { prisma } from '@/src/lib/db-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CheckoutLine = { productId: string; quantity: number };
type CheckoutBuyer = { name?: string; email?: string; phone?: string };
type CheckoutBody = { items: CheckoutLine[]; buyer?: CheckoutBuyer };

function parseBody(value: unknown): CheckoutBody | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.items)) {
    return null;
  }

  const items: CheckoutLine[] = [];
  for (const raw of record.items) {
    if (typeof raw !== 'object' || raw === null) {
      return null;
    }
    const line = raw as Record<string, unknown>;
    if (typeof line.productId !== 'string') {
      return null;
    }
    if (typeof line.quantity !== 'number' || line.quantity <= 0) {
      return null;
    }
    items.push({ productId: line.productId, quantity: Math.floor(line.quantity) });
  }

  const buyer =
    record.buyer && typeof record.buyer === 'object'
      ? (record.buyer as CheckoutBuyer)
      : undefined;

  return { items, buyer };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const raw: unknown = await req.json().catch(() => null);
  const body = parseBody(raw);
  if (!body || body.items.length === 0) {
    return NextResponse.json({ error: 'Invalid cart payload' }, { status: 400 });
  }

  const ids = body.items.map((item) => item.productId);
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== new Set(ids).size) {
    return NextResponse.json({ error: 'Unknown product in cart' }, { status: 400 });
  }

  const priceMap = new Map(products.map((product) => [product.id, product.priceVnd]));
  const titleMap = new Map(products.map((product) => [product.id, product.title]));

  let amount = 0;
  const itemRows = body.items.map((line) => {
    const unit = priceMap.get(line.productId);
    if (typeof unit !== 'number') {
      throw new Error(`Missing price for product ${line.productId}`);
    }
    amount += unit * line.quantity;
    return { productId: line.productId, quantity: line.quantity, unitPrice: unit };
  });

  if (amount <= 0 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: 'Invalid total' }, { status: 400 });
  }

  const origin = req.nextUrl.origin;
  const payOSItems = itemRows.map((line) => ({
    name: (titleMap.get(line.productId) ?? 'Item').slice(0, 25),
    quantity: line.quantity,
    price: line.unitPrice,
  }));

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderCode = await allocateOrderCode();

    try {
      const order = await prisma.order.create({
        data: {
          orderCode,
          amount,
          status: 'PENDING',
          buyerName: body.buyer?.name ?? null,
          buyerEmail: body.buyer?.email ?? null,
          buyerPhone: body.buyer?.phone ?? null,
          items: { create: itemRows },
        },
      });

      try {
        const payment = await getPayOS().paymentRequests.create({
          orderCode,
          amount,
          description: `Order ${orderCode}`.slice(0, 25),
          items: payOSItems,
          returnUrl: `${origin}/checkout/success?orderCode=${orderCode}`,
          cancelUrl: `${origin}/checkout/cancel?orderCode=${orderCode}`,
        });

        await prisma.order.update({
          where: { id: order.id },
          data: { paymentUrl: payment.checkoutUrl },
        });

        return NextResponse.json(
          {
            orderCode,
            amount,
            checkoutUrl: payment.checkoutUrl,
            qrCode: payment.qrCode,
          },
          { status: 200 },
        );
      } catch (payosError) {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });

        if (payosError instanceof PayOSError) {
          return NextResponse.json(
            { error: payosError.message },
            { status: 502 },
          );
        }
        throw payosError;
      }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }
      throw error;
    }
  }

  return NextResponse.json({ error: 'Could not allocate order code' }, { status: 503 });
}
