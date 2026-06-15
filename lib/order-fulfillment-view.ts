// lib/order-fulfillment-view.ts — client-safe order view mapping (no Payload server imports)
import { carrierLabel } from '@/lib/shipment/carriers';
import type { ShipmentEvent, ShipmentStatus } from '@/lib/shipment/types';
import type { Order } from '@/src/payload/payload-types';

export type OrderFulfillmentView = {
  id: string | number;
  orderCode: number;
  customerName: string;
  buyerEmail: string | null;
  phoneNumber: string | null;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  deliveryMethod: string | null;
  shippingAddress: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  shippingCarrierKey: string | null;
  shippingCarrierLabel: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: ShipmentStatus | null;
  shipmentEvents: ShipmentEvent[];
  createdAt: string;
  paidAt: string | null;
  paymentKind: string | null;
  lineItems: { productTitle: string; variantName: string | null; quantity: number; unitPrice: number }[];
};

type OrderExtras = Order & {
  confirmedAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  shippingCarrierKey?: string | null;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shipmentStatus?: ShipmentStatus | null;
  shipmentEvents?: ShipmentEvent[] | null;
};

export function parseShipmentEvents(raw: unknown): ShipmentEvent[] {
  if (!Array.isArray(raw)) return [];
  const events: ShipmentEvent[] = [];
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue;
    const item = row as Record<string, unknown>;
    const status = item.status;
    const message = item.message;
    const occurredAt = item.occurredAt;
    if (typeof status !== 'string' || typeof message !== 'string') continue;
    if (typeof occurredAt !== 'string') continue;
    events.push({
      status: status as ShipmentStatus,
      message,
      location: typeof item.location === 'string' ? item.location : null,
      occurredAt,
    });
  }
  return events;
}

function parseLineItems(raw: unknown): OrderFulfillmentView['lineItems'] {
  if (!Array.isArray(raw)) return [];
  const items: OrderFulfillmentView['lineItems'] = [];
  for (const row of raw) {
    if (typeof row !== 'object' || row === null) continue;
    const item = row as Record<string, unknown>;
    items.push({
      productTitle: typeof item.productTitle === 'string' ? item.productTitle : '',
      variantName: typeof item.variantName === 'string' ? item.variantName : null,
      quantity: typeof item.quantity === 'number' ? item.quantity : 0,
      unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
    });
  }
  return items;
}

export function mapOrderToFulfillmentView(doc: Order): OrderFulfillmentView {
  const extras = doc as OrderExtras;
  const orderCode = Number.parseInt(String(doc.orderId ?? '0'), 10);
  const carrierKey =
    typeof extras.shippingCarrierKey === 'string'
      ? extras.shippingCarrierKey
      : typeof extras.shippingCarrier === 'string' && extras.shippingCarrier.length > 0
        ? 'other'
        : null;

  return {
    id: doc.id,
    orderCode: Number.isFinite(orderCode) ? orderCode : 0,
    customerName: typeof doc.customerName === 'string' ? doc.customerName : '',
    buyerEmail: typeof doc.buyerEmail === 'string' ? doc.buyerEmail : null,
    phoneNumber: typeof doc.phoneNumber === 'string' ? doc.phoneNumber : null,
    totalAmount: typeof doc.totalAmount === 'number' ? doc.totalAmount : 0,
    paymentStatus: typeof doc.paymentStatus === 'string' ? doc.paymentStatus : 'pending',
    orderStatus: typeof doc.orderStatus === 'string' ? doc.orderStatus : 'pending',
    deliveryMethod: typeof doc.deliveryMethod === 'string' ? doc.deliveryMethod : null,
    shippingAddress:
      typeof doc.shippingAddress === 'string' ? doc.shippingAddress : null,
    confirmedAt: typeof extras.confirmedAt === 'string' ? extras.confirmedAt : null,
    shippedAt: typeof extras.shippedAt === 'string' ? extras.shippedAt : null,
    deliveredAt: typeof extras.deliveredAt === 'string' ? extras.deliveredAt : null,
    shippingCarrierKey: carrierKey,
    shippingCarrierLabel:
      carrierKey && carrierKey !== 'other'
        ? carrierLabel(carrierKey)
        : typeof extras.shippingCarrier === 'string'
          ? extras.shippingCarrier
          : '',
    trackingNumber:
      typeof extras.trackingNumber === 'string' ? extras.trackingNumber : null,
    trackingUrl: typeof extras.trackingUrl === 'string' ? extras.trackingUrl : null,
    shipmentStatus:
      typeof extras.shipmentStatus === 'string'
        ? (extras.shipmentStatus as ShipmentStatus)
        : null,
    shipmentEvents: parseShipmentEvents(extras.shipmentEvents),
    createdAt:
      typeof doc.createdAt === 'string' ? doc.createdAt : new Date().toISOString(),
    paidAt: typeof doc.paidAt === 'string' ? doc.paidAt : null,
    paymentKind: typeof doc.paymentKind === 'string' ? doc.paymentKind : null,
    lineItems: parseLineItems((doc as { lineItems?: unknown }).lineItems),
  };
}
