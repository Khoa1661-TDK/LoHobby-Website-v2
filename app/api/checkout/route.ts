// app/api/checkout/route.ts — creates ShopNex-compatible Payload `orders` (VND + VN gateways)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { recordCouponRedemption, validateCoupon } from '@/lib/coupons';
import { submitDropshipOrder } from '@/lib/dropshipping';
import { getDropshipSettings } from '@/lib/dropshipping/settings';
import { recordGiftCardRedemption, validateGiftCard } from '@/lib/gift-cards';
import { resolveCheckoutLines } from '@/lib/inventory';
import { commitOrderInventory } from '@/lib/order-inventory';
import { enforceRateLimit } from '@/lib/api-guard';
import { RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
import { getGatewayConfigForMethod } from '@/lib/payment-gateway-credentials';
import { getPaymentMethodByKey, isPaymentMethodOfferable, type PaymentMethodKind } from '@/lib/payment-methods';
import { credentialsForProvider, getPaymentProvider } from '@/lib/payment-providers';
import { generateOrderCode } from '@/lib/payos';
import { getPayloadProductsByIds, isPurchasableProduct } from '@/lib/payload-products';
import {
  createPayloadOrder,
  updatePayloadOrderPaymentUrl,
} from '@/lib/payload-orders';
import { computeShippingQuote, extractShippingRegion, getShippingSettings } from '@/lib/shipping-settings';
import { syncStoreCustomerForUser } from '@/lib/store-customer-sync';
import { getStoreSettings } from '@/lib/store-settings';
import { computeTaxAmount, resolveTaxSettings } from '@/lib/tax';
import { isGiftCardsEnabled } from '@/lib/feature-flags';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_DELIVERY = ['SHIPMENT', 'PICKUP'] as const;
const MAX_LINE_QUANTITY = 999;
const MAX_DISTINCT_LINES = 100;

type DeliveryMethod = (typeof VALID_DELIVERY)[number];

type CheckoutLine = {
  productId: string;
  quantity: number;
  variantSku?: string | null;
};
type CustomerInfo = {
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
};

type CheckoutBody = {
  items: CheckoutLine[];
  customerInfo: CustomerInfo;
  deliveryMethod: DeliveryMethod;
  paymentMethodKey: string;
  couponCode?: string | null;
  giftCardCode?: string | null;
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

  const byKey = new Map<string, CheckoutLine>();
  for (const raw of record.items) {
    if (typeof raw !== 'object' || raw === null) return null;
    const line = raw as Record<string, unknown>;
    if (typeof line.productId !== 'string' || line.productId.length === 0) return null;
    if (typeof line.quantity !== 'number' || !Number.isFinite(line.quantity) || line.quantity <= 0) {
      return null;
    }
    const productId = line.productId.trim();
    if (!productId) return null;

    let variantSku: string | null = null;
    if (typeof line.variantSku === 'string' && line.variantSku.trim().length > 0) {
      variantSku = line.variantSku.trim();
    }

    const key = variantSku ? `${productId}:${variantSku}` : productId;
    const quantity = Math.floor(line.quantity);
    const next = (byKey.get(key)?.quantity ?? 0) + quantity;
    if (next > MAX_LINE_QUANTITY) return null;
    byKey.set(key, { productId, variantSku, quantity: next });
  }

  const items = Array.from(byKey.values());

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

  let email: string | null = null;
  if (typeof info.email === 'string' && info.email.trim().length > 0) {
    email = info.email.trim().toLowerCase();
  }

  let couponCode: string | null = null;
  if (typeof record.couponCode === 'string' && record.couponCode.trim().length > 0) {
    couponCode = record.couponCode.trim();
  }

  let giftCardCode: string | null = null;
  if (typeof record.giftCardCode === 'string' && record.giftCardCode.trim().length > 0) {
    giftCardCode = record.giftCardCode.trim();
  }

  return {
    items,
    deliveryMethod: delivery as DeliveryMethod,
    paymentMethodKey: paymentKey.trim(),
    couponCode,
    giftCardCode,
    customerInfo: {
      name: info.name.trim(),
      phone: info.phone.trim(),
      email,
      address,
    },
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDuplicateOrderError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes('unique') || error.message.includes('duplicate'))
  );
}

export async function POST(req: NextRequest): Promise<NextResponse<CheckoutResponse | { error: string }>> {
  const rateLimited = enforceRateLimit(req, 'checkout', RATE_LIMIT_PRESETS.checkout);
  if (rateLimited) {
    return rateLimited as NextResponse<CheckoutResponse | { error: string }>;
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  const raw: unknown = await req.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: 'Dữ liệu thanh toán không hợp lệ' }, { status: 400 });
  }

  const buyerEmail = body.customerInfo.email ?? session?.user?.email ?? null;
  if (!userId && (!buyerEmail || !EMAIL_RE.test(buyerEmail))) {
    return NextResponse.json(
      { error: 'Vui lòng nhập email hợp lệ để nhận xác nhận đơn hàng.' },
      { status: 400 },
    );
  }

  const [shippingSettings, storeSettings] = await Promise.all([
    getShippingSettings(),
    getStoreSettings(),
  ]);
  const taxSettings = resolveTaxSettings(storeSettings);

  const shippingAddress =
    body.deliveryMethod === 'PICKUP'
      ? shippingSettings.pickupAddress
      : (body.customerInfo.address ?? '').trim();
  const shippingRegion =
    body.deliveryMethod === 'SHIPMENT' ? extractShippingRegion(shippingAddress) : null;

  const shippingQuote = computeShippingQuote(
    shippingSettings,
    body.deliveryMethod,
    0,
    shippingRegion,
  );
  if ('error' in shippingQuote) {
    return NextResponse.json({ error: shippingQuote.error }, { status: 400 });
  }

  if (body.deliveryMethod === 'SHIPMENT' && shippingAddress.length === 0) {
    return NextResponse.json(
      { error: 'Địa chỉ giao hàng là bắt buộc khi giao tận nhà' },
      { status: 400 },
    );
  }

  const productIds = body.items.map((item) => item.productId);
  const products = await getPayloadProductsByIds(productIds, { requirePurchasable: true });
  if (products.length !== new Set(productIds).size) {
    return NextResponse.json(
      { error: 'Một sản phẩm trong giỏ hàng không còn bán. Hãy cập nhật giỏ hàng và thử lại.' },
      { status: 409 },
    );
  }
  for (const product of products) {
    if (!isPurchasableProduct(product)) {
      return NextResponse.json(
        { error: 'Một sản phẩm trong giỏ hàng không còn bán. Hãy cập nhật giỏ hàng và thử lại.' },
        { status: 409 },
      );
    }
  }

  const priced = await resolveCheckoutLines(
    body.items.map((line) => ({
      productId: line.productId,
      variantSku: line.variantSku ?? null,
      quantity: line.quantity,
    })),
  );
  if (!priced.ok) {
    return NextResponse.json({ error: priced.message }, { status: 409 });
  }

  let subtotal = 0;
  const itemRows = priced.rows.map((row) => {
    subtotal += row.unitPrice * row.quantity;
    return {
      productId: row.productId,
      productTitle: row.productTitle,
      productHandle: row.productHandle,
      variantSku: row.variantSku,
      variantName: row.variantName,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
    };
  });

  const shippingRecalc = computeShippingQuote(
    shippingSettings,
    body.deliveryMethod,
    subtotal,
    shippingRegion,
  );
  if ('error' in shippingRecalc) {
    return NextResponse.json({ error: shippingRecalc.error }, { status: 400 });
  }
  const shippingAmount = shippingRecalc.shippingAmount;

  let discountAmount = 0;
  let couponCode: string | null = null;
  let couponId: string | null = null;

  if (body.couponCode) {
    const couponResult = await validateCoupon(body.couponCode, subtotal);
    if (!couponResult.ok) {
      return NextResponse.json({ error: couponResult.message }, { status: 400 });
    }
    discountAmount = couponResult.discountAmount;
    couponCode = couponResult.normalizedCode;
    couponId = couponResult.coupon.id;
  }

  const taxableBase = Math.max(0, subtotal - discountAmount);
  const taxAmount = computeTaxAmount(taxSettings, taxableBase);
  const totalBeforeGiftCard = taxableBase + taxAmount + shippingAmount;

  let giftCardAmount = 0;
  let giftCardCode: string | null = null;
  let giftCardId: string | null = null;

  if (body.giftCardCode) {
    if (!isGiftCardsEnabled()) {
      return NextResponse.json({ error: 'Thẻ quà tặng hiện không khả dụng.' }, { status: 400 });
    }
    const giftResult = await validateGiftCard(body.giftCardCode, totalBeforeGiftCard);
    if (!giftResult.ok) {
      return NextResponse.json({ error: giftResult.message }, { status: 400 });
    }
    giftCardAmount = giftResult.appliedAmount;
    giftCardCode = giftResult.normalizedCode;
    giftCardId = giftResult.giftCard.id;
  }

  const amount = totalBeforeGiftCard - giftCardAmount;
  if (amount < 0 || !Number.isInteger(amount) || !Number.isSafeInteger(amount)) {
    return NextResponse.json({ error: 'Tổng tiền không hợp lệ' }, { status: 400 });
  }

  const method = await getPaymentMethodByKey(body.paymentMethodKey);
  if (!method || !isPaymentMethodOfferable(method)) {
    return NextResponse.json(
      { error: 'Hình thức thanh toán không khả dụng.' },
      { status: 400 },
    );
  }

  const kind = method.kind;
  let customerId: string | number | null = null;
  if (userId) {
    customerId = await syncStoreCustomerForUser(userId).catch(() => null);
  }

  const titleMap = new Map(priced.rows.map((row) => [row.productId, row.productTitle]));

  for (let attempt = 0; attempt < 5; attempt++) {
    const orderCode = generateOrderCode();

    let createdDocId: string | number | null = null;
    const isFullyPaidByGiftCard = amount === 0 && giftCardAmount > 0;
    try {
      const created = await createPayloadOrder({
        orderCode,
        totalAmount: amount,
        subtotalAmount: subtotal,
        shippingAmount,
        discountAmount,
        taxAmount,
        giftCardCode,
        giftCardAmount,
        couponCode,
        paymentStatus: isFullyPaidByGiftCard ? 'paid' : 'pending',
        orderStatus: isFullyPaidByGiftCard ? 'processing' : 'pending',
        deliveryMethod: body.deliveryMethod,
        paymentMethodKey: method.key,
        paymentKind: kind,
        customerName: body.customerInfo.name,
        buyerEmail,
        phoneNumber: body.customerInfo.phone,
        shippingAddress,
        customerId,
        paidAt: isFullyPaidByGiftCard ? new Date() : null,
        metadata: { prismaUserId: userId },
        lineItems: itemRows,
      });
      createdDocId = created.id;

      if (couponId) {
        await recordCouponRedemption(couponId);
      }
      if (giftCardId && giftCardAmount > 0) {
        await recordGiftCardRedemption(giftCardId, giftCardAmount);
      }

      if (kind !== 'gateway' || amount === 0) {
        await commitOrderInventory(createdDocId);
        const dropship = await getDropshipSettings();
        if (dropship.enabled && dropship.autoSubmitOnPaid) {
          await submitDropshipOrder({
            orderCode,
            items: itemRows.map((line) => ({
              productId: line.productId,
              variantSku: line.variantSku ?? null,
              quantity: line.quantity,
            })),
            shippingAddress,
          }).catch((err: unknown) =>
            logger.warn(
              { route: '/api/checkout', order_code: orderCode, err },
              'dropship stub failed',
            ),
          );
        }
      }
    } catch (error) {
      if (isDuplicateOrderError(error)) {
        continue;
      }
      throw error;
    }

    if (kind !== 'gateway' || amount === 0) {
      return NextResponse.json(
        { success: true, method: kind, orderCode, amount },
        { status: 200 },
      );
    }

    const provider = method.provider ? getPaymentProvider(method.provider) : null;
    const gatewayConfig = provider ? await getGatewayConfigForMethod(method.key) : null;
    if (
      !provider ||
      !gatewayConfig ||
      gatewayConfig.credentials.provider !== method.provider ||
      createdDocId === null
    ) {
      const config = await import('@payload-config');
      const { getPayload } = await import('payload');
      const payload = await getPayload({ config: config.default });
      await payload.update({
        collection: 'orders',
        id: createdDocId,
        data: { orderStatus: 'canceled', paymentStatus: 'failed' },
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

      await updatePayloadOrderPaymentUrl(createdDocId, payment.checkoutUrl);

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
      const config = await import('@payload-config');
      const { getPayload } = await import('payload');
      const payload = await getPayload({ config: config.default });
      await payload.update({
        collection: 'orders',
        id: createdDocId,
        data: { orderStatus: 'canceled', paymentStatus: 'failed' },
      });

      const message =
        gatewayError instanceof Error
          ? gatewayError.message
          : 'Không thể tạo liên kết thanh toán.';
      logger.error(
        { route: '/api/checkout', order_code: orderCode, err: gatewayError },
        'payment gateway error',
      );
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json({ error: 'Không thể tạo mã đơn hàng' }, { status: 503 });
}
