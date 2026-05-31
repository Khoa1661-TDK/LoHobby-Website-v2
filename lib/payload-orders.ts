// lib/payload-orders.ts — Payload `orders` collection (ShopNex-compatible, VND)
import config from '@payload-config';
import { getPayload } from 'payload';
import type { Order } from '@/src/payload/payload-types';

export type PayloadOrderLine = {
  productId: string;
  productTitle: string;
  productHandle: string;
  variantSku: string | null;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
};

export type PayloadPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PayloadOrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'canceled';

export type UpdatePayloadOrderStatusInput = {
  docId: string | number;
  paymentStatus?: PayloadPaymentStatus;
  orderStatus?: PayloadOrderStatus;
};

export type CreatePayloadOrderInput = {
  orderCode: number;
  totalAmount: number;
  subtotalAmount: number;
  shippingAmount: number;
  discountAmount: number;
  taxAmount?: number;
  giftCardCode?: string | null;
  giftCardAmount?: number;
  couponCode: string | null;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
  deliveryMethod: 'SHIPMENT' | 'PICKUP';
  paymentMethodKey: string;
  paymentKind: string;
  customerName: string;
  buyerEmail: string | null;
  phoneNumber: string;
  shippingAddress: string;
  paymentUrl?: string | null;
  paidAt?: Date | null;
  inventoryAdjusted?: boolean;
  customerId?: string | number | null;
  metadata?: Record<string, unknown>;
  lineItems: PayloadOrderLine[];
};

export async function createPayloadOrder(
  input: CreatePayloadOrderInput,
): Promise<{ id: string | number }> {
  const payload = await getPayload({ config });
  const doc = await payload.create({
    collection: 'orders',
    draft: false,
    data: {
      orderId: String(input.orderCode),
      totalAmount: input.totalAmount,
      subtotalAmount: input.subtotalAmount,
      shippingAmount: input.shippingAmount,
      discountAmount: input.discountAmount,
      taxAmount: input.taxAmount ?? 0,
      giftCardCode: input.giftCardCode,
      giftCardAmount: input.giftCardAmount ?? 0,
      couponCode: input.couponCode,
      currency: 'VND',
      customer:
        input.customerId != null && String(input.customerId).length > 0
          ? Number(input.customerId)
          : undefined,
      paymentStatus: input.paymentStatus,
      orderStatus: input.orderStatus,
      deliveryMethod: input.deliveryMethod,
      paymentMethodKey: input.paymentMethodKey,
      paymentKind: input.paymentKind,
      customerName: input.customerName,
      buyerEmail: input.buyerEmail,
      phoneNumber: input.phoneNumber,
      shippingAddress: input.shippingAddress,
      paymentUrl: input.paymentUrl,
      paidAt: input.paidAt?.toISOString(),
      inventoryAdjusted: input.inventoryAdjusted ?? false,
      lineItems: input.lineItems,
      metadata: input.metadata ?? {},
    },
    // Extended order fields (tax, gift card, tracking) — run `pnpm payload:types` after schema push
  } as Parameters<typeof payload.create>[0]);
  return { id: doc.id };
}

export async function updatePayloadOrderPaymentUrl(
  orderDocId: string | number,
  paymentUrl: string,
): Promise<void> {
  const payload = await getPayload({ config });
  await payload.update({
    collection: 'orders',
    id: orderDocId,
    data: { paymentUrl },
  });
}

export async function markPayloadOrderPaid(
  orderCode: number,
  amount: number,
): Promise<{ matched: boolean; docId: string | number | null }> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { orderId: { equals: String(orderCode) } },
        { totalAmount: { equals: amount } },
        { paymentStatus: { equals: 'pending' } },
      ],
    },
    limit: 1,
    pagination: false,
    depth: 0,
  });

  const doc = found.docs[0];
  if (!doc?.id) return { matched: false, docId: null };

  await payload.update({
    collection: 'orders',
    id: doc.id,
    data: {
      paymentStatus: 'paid',
      orderStatus: 'processing',
      paidAt: new Date().toISOString(),
    },
  });

  return { matched: true, docId: doc.id };
}

export async function getPayloadOrderById(docId: string | number): Promise<Order | null> {
  const payload = await getPayload({ config });
  try {
    return (await payload.findByID({
      collection: 'orders',
      id: docId,
      depth: 0,
    })) as Order;
  } catch {
    return null;
  }
}

/** Admin: update payment and/or fulfillment status on a Payload order (ShopNex SoT). */
export async function updatePayloadOrderStatus(
  input: UpdatePayloadOrderStatusInput,
): Promise<{ ok: true; doc: Order } | { ok: false; message: string }> {
  const existing = await getPayloadOrderById(input.docId);
  if (!existing) {
    return { ok: false, message: 'Không tìm thấy đơn hàng.' };
  }

  const paymentStatus = input.paymentStatus ?? existing.paymentStatus;
  const orderStatus = input.orderStatus ?? existing.orderStatus;

  const payload = await getPayload({ config });
  const data: Record<string, unknown> = { paymentStatus, orderStatus };

  if (paymentStatus === 'paid' && existing.paymentStatus !== 'paid') {
    data.paidAt = new Date().toISOString();
  }

  const doc = (await payload.update({
    collection: 'orders',
    id: input.docId,
    data,
    depth: 0,
  })) as Order;

  return { ok: true, doc };
}

export async function getPayloadOrderByCode(orderCode: number) {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'orders',
    where: { orderId: { equals: String(orderCode) } },
    limit: 1,
    pagination: false,
    depth: 1,
  });
  return found.docs[0] ?? null;
}

export async function listPayloadOrdersForUser(input: {
  prismaUserId?: string | null;
  buyerEmail?: string | null;
  limit?: number;
}): Promise<Order[]> {
  const payload = await getPayload({ config });
  const limit = input.limit ?? 50;
  const seen = new Set<number>();
  const docs: Order[] = [];

  const pushUnique = (rows: Order[]): void => {
    for (const row of rows) {
      if (!row?.id || seen.has(row.id)) continue;
      seen.add(row.id);
      docs.push(row);
      if (docs.length >= limit) return;
    }
  };

  if (input.buyerEmail) {
    const byEmail = await payload.find({
      collection: 'orders',
      where: { buyerEmail: { equals: input.buyerEmail.trim().toLowerCase() } },
      sort: '-createdAt',
      limit,
      pagination: false,
      depth: 0,
    });
    pushUnique(byEmail.docs as Order[]);
  }

  if (input.prismaUserId && docs.length < limit) {
    const all = await payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 200,
      pagination: false,
      depth: 0,
    });
    const filtered = (all.docs as Order[]).filter((doc) => {
      const meta = doc.metadata as { prismaUserId?: string } | null | undefined;
      return meta?.prismaUserId === input.prismaUserId;
    });
    pushUnique(filtered);
  }

  return docs.slice(0, limit);
}

/** Product IDs from non-canceled Payload orders for recommendations / verified reviews. */
export async function listPurchasedProductIdsForUser(input: {
  prismaUserId: string;
  buyerEmail?: string | null;
}): Promise<string[]> {
  const docs = await listPayloadOrdersForUser({
    prismaUserId: input.prismaUserId,
    buyerEmail: input.buyerEmail,
    limit: 100,
  });

  const ids = new Set<string>();
  for (const doc of docs) {
    if (doc.orderStatus === 'canceled' || doc.paymentStatus === 'failed') continue;
    if (doc.paymentKind === 'gateway' && doc.paymentStatus !== 'paid') continue;

    const lineItems = Array.isArray(doc.lineItems) ? doc.lineItems : [];
    for (const raw of lineItems) {
      if (typeof raw !== 'object' || raw === null) continue;
      const row = raw as Record<string, unknown>;
      const productId = typeof row.productId === 'string' ? row.productId : '';
      if (productId) ids.add(productId);
    }
  }
  return [...ids];
}
