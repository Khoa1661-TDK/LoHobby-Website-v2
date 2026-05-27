// app/api/checkout/route.ts
import { PayOSError } from '@payos/node';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import {
  allocateOrderCode,
  getPayOS,
  isUniqueConstraintError,
} from '@/lib/payos';
import { prisma } from '@/src/lib/db-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PICKUP_ADDRESS = 'Trụ sở chính, TP.HCM, Việt Nam';
const VALID_DELIVERY = ['SHIPMENT', 'PICKUP'] as const;
const VALID_PAYMENT = ['COD', 'PAY_ONLINE'] as const;

type DeliveryMethod = (typeof VALID_DELIVERY)[number];
type PaymentMethod = (typeof VALID_PAYMENT)[number];

type CheckoutLine = { productId: string; quantity: number };
type CustomerInfo = { name: string; phone: string; address?: string | null };

type CheckoutBody = {
  items: CheckoutLine[];
  customerInfo: CustomerInfo;
  deliveryMethod: DeliveryMethod;
  paymentMethod: PaymentMethod;
};

type CodSuccess = {
  success: true;
  method: 'COD';
  orderCode: number;
  amount: number;
};
type OnlineSuccess = {
  success: true;
  method: 'PAY_ONLINE';
  orderCode: number;
  amount: number;
  checkoutUrl: string;
  qrCode?: string;
};
type CheckoutResponse = CodSuccess | OnlineSuccess;

function parseBody(value: unknown): CheckoutBody | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;

  if (!Array.isArray(record.items) || record.items.length === 0) return null;
  const items: CheckoutLine[] = [];
  for (const raw of record.items) {
    if (typeof raw !== 'object' || raw === null) return null;
    const line = raw as Record<string, unknown>;
    if (typeof line.productId !== 'string' || line.productId.length === 0) return null;
    if (typeof line.quantity !== 'number' || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      return null;
    }
    items.push({ productId: line.productId, quantity: Math.floor(line.quantity) });
  }

  const delivery = record.deliveryMethod;
  if (typeof delivery !== 'string' || !VALID_DELIVERY.includes(delivery as DeliveryMethod)) {
    return null;
  }
  const payment = record.paymentMethod;
  if (typeof payment !== 'string' || !VALID_PAYMENT.includes(payment as PaymentMethod)) {
    return null;
  }

  const ci = record.customerInfo;
  if (typeof ci !== 'object' || ci === null) return null;
  const info = ci as Record<string, unknown>;
  if (typeof info.name !== 'string' || info.name.trim().length === 0) return null;
  if (typeof info.phone !== 'string' || info.phone.trim().length === 0) return null;

  let address: string | null = null;
  if (typeof info.address === 'string' && info.address.trim().length > 0) {
    address = info.address.trim();
  }

  return {
    items,
    deliveryMethod: delivery as DeliveryMethod,
    paymentMethod: payment as PaymentMethod,
    customerInfo: {
      name: info.name.trim(),
      phone: info.phone.trim(),
      address,
    },
  };
}

export async function POST(req: NextRequest): Promise<NextResponse<CheckoutResponse | { error: string }>> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Bạn cần đăng nhập để thanh toán.' }, { status: 401 });
  }

  const raw: unknown = await req.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: 'Dữ liệu thanh toán không hợp lệ' }, { status: 400 });
  }

  // Resolve shipping address based on delivery method.
  const shippingAddress =
    body.deliveryMethod === 'PICKUP'
      ? PICKUP_ADDRESS
      : (body.customerInfo.address ?? '').trim();
  if (body.deliveryMethod === 'SHIPMENT' && shippingAddress.length === 0) {
    return NextResponse.json(
      { error: 'Địa chỉ giao hàng là bắt buộc khi giao tận nhà' },
      { status: 400 },
    );
  }

  const ids = body.items.map((item) => item.productId);
  const { getPayloadProductsByIds } = await import('@/lib/payload-products');
  const products = await getPayloadProductsByIds(ids);
  if (products.length !== new Set(ids).size) {
    return NextResponse.json({ error: 'Sản phẩm trong giỏ hàng không tồn tại' }, { status: 400 });
  }

  const priceMap = new Map(
    products.map((product) => [product.id, Number(product.priceRange.minVariantPrice.amount)]),
  );
  const titleMap = new Map(products.map((product) => [product.id, product.title]));
  const handleMap = new Map(products.map((product) => [product.id, product.handle]));

  let amount = 0;
  const itemRows = body.items.map((line) => {
    const unit = priceMap.get(line.productId);
    if (typeof unit !== 'number') {
      throw new Error(`Missing price for product ${line.productId}`);
    }
    amount += unit * line.quantity;
    return {
      productId: line.productId,
      productTitle: titleMap.get(line.productId) ?? 'Sản phẩm',
      productHandle: handleMap.get(line.productId) ?? '',
      quantity: line.quantity,
      unitPrice: unit,
    };
  });

  if (amount <= 0 || !Number.isInteger(amount)) {
    return NextResponse.json({ error: 'Tổng tiền không hợp lệ' }, { status: 400 });
  }

  const isOnline = body.paymentMethod === 'PAY_ONLINE';
  const initialStatus = isOnline ? 'PENDING_ONLINE' : 'PENDING_COD';

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderCode = await allocateOrderCode();

    let createdOrderId: string | null = null;
    try {
      const order = await prisma.order.create({
        data: {
          orderCode,
          userId: session.user.id,
          amount,
          status: initialStatus,
          deliveryMethod: body.deliveryMethod,
          paymentMethod: body.paymentMethod,
          customerName: body.customerInfo.name,
          phoneNumber: body.customerInfo.phone,
          shippingAddress,
          buyerName: body.customerInfo.name,
          buyerEmail: session.user.email ?? null,
          buyerPhone: body.customerInfo.phone,
          items: { create: itemRows },
        },
      });
      createdOrderId = order.id;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        continue;
      }
      throw error;
    }

    // ----- Cash on Delivery: persist & return without payOS -----
    if (!isOnline) {
      return NextResponse.json(
        { success: true, method: 'COD', orderCode, amount },
        { status: 200 },
      );
    }

    // ----- Pay Online: create payOS link -----
    const origin = req.nextUrl.origin;
    const payOSItems = itemRows.map((line) => ({
      name: (titleMap.get(line.productId) ?? 'Sản phẩm').slice(0, 25),
      quantity: line.quantity,
      price: line.unitPrice,
    }));

    try {
      const payment = await getPayOS().paymentRequests.create({
        orderCode,
        amount,
        description: `Đơn hàng ${orderCode}`.slice(0, 25),
        items: payOSItems,
        returnUrl: `${origin}/checkout/success?orderCode=${orderCode}`,
        cancelUrl: `${origin}/checkout/cancel?orderCode=${orderCode}`,
      });

      await prisma.order.update({
        where: { id: createdOrderId },
        data: { paymentUrl: payment.checkoutUrl },
      });

      return NextResponse.json(
        {
          success: true,
          method: 'PAY_ONLINE',
          orderCode,
          amount,
          checkoutUrl: payment.checkoutUrl,
          qrCode: payment.qrCode,
        },
        { status: 200 },
      );
    } catch (payosError) {
      await prisma.order.update({
        where: { id: createdOrderId },
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
  }

  return NextResponse.json({ error: 'Không thể tạo mã đơn hàng' }, { status: 503 });
}
