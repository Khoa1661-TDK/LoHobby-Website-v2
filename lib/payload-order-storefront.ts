// lib/payload-order-storefront.ts — storefront status + ownership for Payload orders

export type StorefrontOrderStatus =
  | 'PENDING'
  | 'PENDING_COD'
  | 'PENDING_ONLINE'
  | 'PENDING_TRANSFER'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export function mapPayloadOrderToStorefrontStatus(doc: {
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
}): StorefrontOrderStatus {
  if (doc.orderStatus === 'canceled') return 'CANCELLED';
  if (doc.orderStatus === 'delivered') return 'DELIVERED';
  if (doc.orderStatus === 'shipped') return 'SHIPPED';
  if (doc.paymentStatus === 'paid') return 'PAID';
  if (doc.paymentKind === 'cod') return 'PENDING_COD';
  if (doc.paymentKind === 'manual_transfer') return 'PENDING_TRANSFER';
  if (doc.paymentKind === 'gateway') return 'PENDING_ONLINE';
  return 'PENDING';
}
export function ownsPayloadOrder(
  doc: { metadata?: unknown; buyerEmail?: string | null },
  input: { userId: string; email?: string | null },
): boolean {
  const meta = doc.metadata as { prismaUserId?: string } | null | undefined;
  if (meta?.prismaUserId === input.userId) return true;
  if (
    typeof doc.buyerEmail === 'string' &&
    input.email &&
    doc.buyerEmail.toLowerCase() === input.email.toLowerCase()
  ) {
    return true;
  }
  return false;
}

/** Map combined storefront status → Payload payment + fulfillment fields (admin actions). */
export function mapStorefrontStatusToPayloadFields(status: StorefrontOrderStatus): {
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  orderStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
} {
  switch (status) {
    case 'PAID':
      return { paymentStatus: 'paid', orderStatus: 'processing' };
    case 'SHIPPED':
      return { paymentStatus: 'paid', orderStatus: 'shipped' };
    case 'DELIVERED':
      return { paymentStatus: 'paid', orderStatus: 'delivered' };
    case 'CANCELLED':
      return { paymentStatus: 'failed', orderStatus: 'canceled' };
    default:
      return { paymentStatus: 'pending', orderStatus: 'pending' };
  }
}

export async function cancelPendingGatewayOrder(orderCode: number): Promise<boolean> {
  const config = await import('@payload-config');
  const { getPayload } = await import('payload');
  const payload = await getPayload({ config: config.default });
  const found = await payload.find({
    collection: 'orders',
    where: { orderId: { equals: String(orderCode) } },
    limit: 1,
    pagination: false,
    depth: 0,
  });
  const doc = found.docs[0];
  if (!doc?.id) return false;
  const status = mapPayloadOrderToStorefrontStatus(doc);
  if (status !== 'PENDING_ONLINE') return false;
  await payload.update({
    collection: 'orders',
    id: doc.id,
    data: { orderStatus: 'canceled', paymentStatus: 'failed' },
  });
  return true;
}
