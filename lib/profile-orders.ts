// lib/profile-orders.ts — profile UI reads Payload `orders` (ShopNex SoT)
import type { ProfileOrder, ProfileOrderStatus } from '@/app/[locale]/(storefront)/profile/types';
import { carrierLabel } from '@/lib/shipment/carriers';
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from '@/lib/shipment/types';
import { listPayloadOrdersForUser } from '@/lib/payload-orders';
import { deriveOrderStage } from '@/lib/order-stage';

function mapStatus(doc: {
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
}): ProfileOrderStatus {
  const stage = deriveOrderStage({ ...doc, confirmedAt: null, deliveryMethod: null });
  switch (stage) {
    case 'cancelled':
    case 'refunded':
      return 'CANCELLED';
    case 'delivered':
      return 'DELIVERED';
    case 'shipped':
    case 'packing':
      return 'SHIPPED';
    case 'to_confirm':
      return doc.paymentStatus === 'paid'
        ? 'PAID'
        : doc.paymentKind === 'cod'
          ? 'PENDING_COD'
          : doc.paymentKind === 'manual_transfer'
            ? 'PENDING_TRANSFER'
            : 'PENDING';
    case 'awaiting_payment':
      return 'PENDING_ONLINE';
    case 'payment_failed':
    default:
      return 'PENDING';
  }
}
function mapPaymentMethod(
  paymentKind: string | null | undefined,
): 'COD' | 'PAY_ONLINE' | null {
  if (paymentKind === 'cod') return 'COD';
  if (paymentKind === 'gateway') return 'PAY_ONLINE';
  return null;
}

export async function loadProfileOrders(input: {
  userId: string;
  email: string;
}): Promise<ProfileOrder[]> {
  const docs = await listPayloadOrdersForUser({
    prismaUserId: input.userId,
    buyerEmail: input.email,
    limit: 50,
  });

  return docs.map((doc) => {
    const lineItems = Array.isArray(doc.lineItems) ? doc.lineItems : [];
    const orderCode = Number.parseInt(String(doc.orderId ?? '0'), 10);
    const extras = doc as {
      trackingNumber?: string | null;
      shippingCarrierKey?: string | null;
      shippingCarrier?: string | null;
      shipmentStatus?: string | null;
    };
    const carrierKey =
      typeof extras.shippingCarrierKey === 'string' ? extras.shippingCarrierKey : null;
    const carrier =
      carrierKey && carrierKey !== 'other'
        ? carrierLabel(carrierKey)
        : typeof extras.shippingCarrier === 'string'
          ? extras.shippingCarrier
          : null;
    const shipmentStatus =
      typeof extras.shipmentStatus === 'string'
        ? (extras.shipmentStatus as ShipmentStatus)
        : null;

    return {
      id: String(doc.id),
      orderCode: Number.isFinite(orderCode) ? orderCode : 0,
      status: mapStatus(doc),
      amount: typeof doc.totalAmount === 'number' ? doc.totalAmount : 0,
      itemCount: lineItems.length,
      deliveryMethod:
        doc.deliveryMethod === 'SHIPMENT' || doc.deliveryMethod === 'PICKUP'
          ? doc.deliveryMethod
          : null,
      paymentMethod: mapPaymentMethod(
        typeof doc.paymentKind === 'string' ? doc.paymentKind : null,
      ),
      shippingAddress:
        typeof doc.shippingAddress === 'string' ? doc.shippingAddress : null,
      createdAt:
        typeof doc.createdAt === 'string'
          ? doc.createdAt
          : new Date().toISOString(),
      paidAt: typeof doc.paidAt === 'string' ? doc.paidAt : null,
      trackingNumber:
        typeof extras.trackingNumber === 'string' ? extras.trackingNumber : null,
      carrierLabel: carrier,
      shipmentStatusLabel: shipmentStatus
        ? SHIPMENT_STATUS_LABELS[shipmentStatus]
        : null,
    };
  });
}
