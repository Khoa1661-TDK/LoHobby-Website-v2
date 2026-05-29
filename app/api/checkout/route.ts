// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getGatewayConfigForMethod } from '@/lib/payment-gateway-credentials';
import { getPaymentMethodByKey, type PaymentMethodKind } from '@/lib/payment-methods';
import { credentialsForProvider, getPaymentProvider } from '@/lib/payment-providers';
import { generateOrderCode, isUniqueConstraintError } from '@/lib/payos';
import { prisma } from '@/src/lib/db-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PICKUP_ADDRESS = 'Trụ sở chính, TP.HCM, Việt Nam';
const VALID_DELIVERY = ['SHIPMENT', 'PICKUP'] as const;
const MAX_LINE_QUANTITY = 999;
const MAX_DISTINCT_LINES = 100;

type DeliveryMethod = (typeof VALID_DELIVERY)[number];

type CheckoutLine = { productId: string; quantity: number };
type CustomerInfo = { name: string; phone: string; address?: string | null };

type CheckoutBody = {
  items: CheckoutLine[];
  customerInfo: CustomerInfo;
  deliveryMethod: DeliveryMethod;
  paymentMethodKey: string;
};

type CheckoutSuccess = {
  success: true;
  method: PaymentMethodKind;
  orderCode: number;
  amount: number;
  checkoutUrl?: string;
  qrCode?: string;
};
type CheckoutResponse = CheckoutSuccess;

function parseBody(value: unknown): CheckoutBody | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;

  if (!Array.isArray(record.items) || record.items.length === 0) return null;
  if (record.items.length > MAX_DISTINCT_LINES) return null;

  // Dedupe productIds: if the client submits the same productId twice we
  // sum the quantities into a single OrderItem row instead of creating
  // duplicates (which would otherwise inflate the DB and confuse fulfilment).
  const byProductId = new Map<string, number>();
  for (const raw of record.items) {
    if (typeof raw !== 'object' || raw === null) return null;
    const line = raw as Record<string, unknown>;
    if (typeof line.productId !== 'string' || line.productId.length === 0) return null;
    if (typeof line.quantity !== 'number' || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      return null;
    }
    const productId = line.productId.trim();
    if (!productId) return null;

    const quantity = Math.floor(line.quantity);
    const next = (byProductId.get(productId) ?? 0) + quantity;
    if (next > MAX_LINE_QUANTITY) return null;
    byProductId.set(productId, next);
  }

  const items: CheckoutLine[] = Array.from(byProductId, ([productId, quantity]) => ({
    productId,
    quantity,
  }));

  const delivery = record.deliveryMethod;
  if (typeof delivery !== 'string' || !VALID_DELIVERY.includes(delivery as DeliveryMethod)) {
    return null;
  }
  const paymentKey = record.paymentMethodKey;
  if (typeof paymentKey !== 'string' || paymentKey.trim().length === 0) {
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
    paymentMethodKey: paymentKey.trim(),
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
  // requirePurchasable: also rejects products with `available: false`, not just
  // the hidden-tag check. This is what enforces "out of stock" on the server
  // even if a stale cart cookie or tampered request slips one through.
  const products = await getPayloadProductsByIds(ids, { requirePurchasable: true });
  if (products.length !== ids.length) {
    return NextResponse.json(
      { error: 'Một sản phẩm trong giỏ hàng không còn bán. Hãy cập nhật giỏ hàng và thử lại.' },
      { status: 409 },
    );
  }

  const priceMap = new Map(
    products.map((product) => [product.id, Number(product.priceRange.minVariantPrice.amount)]),
  );
  const titleMap = new Map(products.map((product) => [product.id, product.title]));
  const handleMap = new Map(products.map((product) => [product.id, product.handle]));

  let amount = 0;
  const itemRows = body.items.map((line) => {
    const unit = priceMap.get(line.productId);
    if (typeof unit !== 'number' || !Number.isFinite(unit) || unit < 0) {
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

  if (amount <= 0 || !Number.isInteger(amount) || !Number.isSafeInteger(amount)) {
    return NextResponse.json({ error: 'Tổng tiền không hợp lệ' }, { status: 400 });
  }

  // Resolve the selected method from the CMS. This is the server-side source of
  // truth: a key that is unknown or disabled is rejected here.
  const method = await getPaymentMethodByKey(body.paymentMethodKey);
  if (!method || !method.enabled) {
    return NextResponse.json(
      { error: 'Hình thức thanh toán không khả dụng.' },
      { status: 400 },
    );
  }

  const kind = method.kind;
  const initialStatus =
    kind === 'gateway'
      ? 'PENDING_ONLINE'
      : kind === 'manual_transfer'
        ? 'PENDING_TRANSFER'
        : 'PENDING_COD';
  // Legacy enum retained for backward compatibility; manual_transfer has no enum value.
  const legacyPaymentMethod = kind === 'gateway' ? 'PAY_ONLINE' : kind === 'cod' ? 'COD' : null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderCode = generateOrderCode();

    let createdOrderId: string | null = null;
    try {
      const order = await prisma.order.create({
        data: {
          orderCode,
          userId: session.user.id,
          amount,
          status: initialStatus,
          deliveryMethod: body.deliveryMethod,
          paymentMethod: legacyPaymentMethod,
          paymentMethodKey: method.key,
          paymentKind: kind,
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

    // ----- COD / manual transfer: settle offline, no gateway call -----
    if (kind !== 'gateway') {
      return NextResponse.json(
        { success: true, method: kind, orderCode, amount },
        { status: 200 },
      );
    }

    // ----- Gateway: resolve provider + decrypted credentials (CMS or env fallback) -----
    const provider = method.provider ? getPaymentProvider(method.provider) : null;
    const gatewayConfig = provider ? await getGatewayConfigForMethod(method.key) : null;
    if (
      !provider ||
      !gatewayConfig ||
      gatewayConfig.credentials.provider !== method.provider
    ) {
      await prisma.order.update({
        where: { id: createdOrderId },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json(
        { error: 'Cổng thanh toán chưa được cấu hình.' },
        { status: 500 },
      );
    }

    const origin = req.nextUrl.origin;
    const gatewayItems = itemRows.map((line) => ({
      name: (titleMap.get(line.productId) ?? 'Sản phẩm').slice(0, 25),
      quantity: line.quantity,
      price: line.unitPrice,
    }));

    try {
      const payment = await provider.createPaymentLink(
        {
          orderCode,
          amount,
          description: `Đơn hàng ${orderCode}`.slice(0, 25),
          items: gatewayItems,
          returnUrl: `${origin}/checkout/success?orderCode=${orderCode}`,
          cancelUrl: `${origin}/checkout/cancel?orderCode=${orderCode}`,
          origin,
          sandboxMode: gatewayConfig.sandboxMode,
        },
        credentialsForProvider(method.provider, gatewayConfig.credentials),
      );

      await prisma.order.update({
        where: { id: createdOrderId },
        data: { paymentUrl: payment.checkoutUrl },
      });

      return NextResponse.json(
        {
          success: true,
          method: kind,
          orderCode,
          amount,
          checkoutUrl: payment.checkoutUrl,
          qrCode: payment.qrCode,
        },
        { status: 200 },
      );
    } catch (gatewayError) {
      await prisma.order.update({
        where: { id: createdOrderId },
        data: { status: 'CANCELLED' },
      });

      const message =
        gatewayError instanceof Error
          ? gatewayError.message
          : 'Không thể tạo liên kết thanh toán.';
      console.error('[checkout] gateway error', gatewayError);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Không thể tạo mã đơn hàng' }, { status: 503 });
}
