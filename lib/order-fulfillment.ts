// lib/order-fulfillment.ts — confirm orders, assign shipments, sync tracking, auto-complete delivery

import config from '@payload-config';
import { getPayload } from 'payload';
import { buildTrackingUrl, getShipmentCarrier } from '@/lib/shipment/carriers';
import {
  lookupShipmentStatus,
  mergeShipmentEvents,
} from '@/lib/shipment/tracking-provider';
import type { ShipmentEvent, ShipmentStatus } from '@/lib/shipment/types';
import { isTerminalShipmentStatus } from '@/lib/shipment/types';
import { isOrderConfirmable } from '@/lib/order-fulfillment-eligibility';
import {
  mapOrderToFulfillmentView,
  parseShipmentEvents,
  type OrderFulfillmentView,
} from '@/lib/order-fulfillment-view';
import { commitOrderInventory } from '@/lib/order-inventory';
import {
  fetchPayloadOrderRowById,
  mapPayloadOrderRowToFulfillmentView,
  markPayloadOrderPaidByIdSql,
} from '@/lib/payload-order-db';
import { getPayloadOrderById } from '@/lib/payload-orders';
import type { Order } from '@/src/payload/payload-types';
import type { ShipmentCarrierKey } from '@/lib/shipment/carriers';

export type { OrderFulfillmentView } from '@/lib/order-fulfillment-view';
export { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
export async function listOrdersForFulfillment(limit = 100): Promise<OrderFulfillmentView[]> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'orders',
    sort: '-createdAt',
    limit,
    pagination: false,
    depth: 0,
  });

  return (found.docs as Order[]).map(mapOrderToFulfillmentView);
}

export type FulfillmentResult =
  | { ok: true; order: OrderFulfillmentView }
  | { ok: false; message: string };

/** Admin reconciles a stuck pending order (paid externally before webhook existed). */
export async function markOrderAsPaid(docId: string | number): Promise<FulfillmentResult> {
  const existing = await fetchPayloadOrderRowById(docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };
  if (existing.order_status === 'canceled') {
    return { ok: false, message: 'Đơn hàng đã bị hủy.' };
  }
  if (existing.payment_status === 'paid') {
    return { ok: false, message: 'Đơn hàng đã được đánh dấu thanh toán.' };
  }

  // Direct SQL — payload.update() deadlocks when CMS is open (getPayload mutex + hooks).
  let updated;
  try {
    updated = await markPayloadOrderPaidByIdSql(docId);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('lock timeout') || message.includes('55P03')) {
      return {
        ok: false,
        message:
          'Đơn hàng đang bị khóa bởi CMS (tab admin mở quá lâu). Tải lại trang hoặc khởi động lại `pnpm dev` rồi thử lại.',
      };
    }
    throw err;
  }
  if (!updated) {
    return { ok: false, message: 'Không thể cập nhật trạng thái thanh toán.' };
  }

  if (existing.inventory_adjusted !== true) {
    queueMicrotask(() => {
      void commitOrderInventory(docId).catch((err: unknown) => {
        console.warn('[markOrderAsPaid] inventory commit failed', err);
      });
    });
  }

  return { ok: true, order: mapPayloadOrderRowToFulfillmentView(updated) };
}

/** Admin confirms a paid order is ready for fulfillment. */
export async function confirmOrder(docId: string | number): Promise<FulfillmentResult> {
  const existing = await getPayloadOrderById(docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };

  if (existing.orderStatus === 'canceled') {
    return { ok: false, message: 'Đơn hàng đã bị hủy.' };
  }

  const extras = existing as Order & {
    confirmedAt?: string | null;
    shippedAt?: string | null;
    shippingCarrierKey?: string | null;
    trackingNumber?: string | null;
    shipmentStatus?: ShipmentStatus | null;
    shipmentEvents?: ShipmentEvent[] | null;
  };
  if (
    !isOrderConfirmable({
      paymentStatus: existing.paymentStatus,
      orderStatus: existing.orderStatus,
      paymentKind: existing.paymentKind,
      confirmedAt: extras.confirmedAt,
    })
  ) {
    return {
      ok: false,
      message: 'Chỉ xác nhận đơn đã thanh toán, COD hoặc chuyển khoản.',
    };
  }

  if (extras.confirmedAt) {
    return { ok: false, message: 'Đơn hàng đã được xác nhận trước đó.' };
  }

  const payload = await getPayload({ config });
  const now = new Date().toISOString();
  const doc = (await payload.update({
    collection: 'orders',
    id: docId,
    data: {
      confirmedAt: now,
      orderStatus: 'processing',
    },
    depth: 0,
  })) as Order;

  return { ok: true, order: mapOrderToFulfillmentView(doc) };
}

export type AssignShipmentInput = {
  docId: string | number;
  carrierKey: string;
  trackingNumber: string;
  customTrackingUrl?: string | null;
};

/** Admin assigns carrier + tracking number and marks order as shipped. */
export async function assignShipment(input: AssignShipmentInput): Promise<FulfillmentResult> {
  const existing = await getPayloadOrderById(input.docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };

  if (existing.orderStatus === 'canceled') {
    return { ok: false, message: 'Đơn hàng đã bị hủy.' };
  }
  if (
    existing.paymentStatus !== 'paid' &&
    existing.paymentKind !== 'cod' &&
    existing.paymentKind !== 'manual_transfer'
  ) {
    return { ok: false, message: 'Chỉ giao hàng cho đơn đã thanh toán hoặc COD.' };
  }
  if (existing.deliveryMethod === 'PICKUP') {
    return { ok: false, message: 'Đơn nhận tại cửa hàng không cần vận chuyển.' };
  }

  const extras = existing as Order & {
    confirmedAt?: string | null;
    shippedAt?: string | null;
    shippingCarrierKey?: string | null;
    trackingNumber?: string | null;
    shipmentStatus?: ShipmentStatus | null;
    shipmentEvents?: ShipmentEvent[] | null;
  };
  if (!extras.confirmedAt) {
    return { ok: false, message: 'Vui lòng xác nhận đơn hàng trước khi giao cho đơn vị vận chuyển.' };
  }

  const trackingNumber = input.trackingNumber.trim();
  if (trackingNumber.length < 3) {
    return { ok: false, message: 'Mã vận đơn không hợp lệ.' };
  }

  const carrier = getShipmentCarrier(input.carrierKey);
  if (!carrier) {
    return { ok: false, message: 'Đơn vị vận chuyển không hợp lệ.' };
  }
  if (input.carrierKey === 'other' && !input.customTrackingUrl?.trim()) {
    return { ok: false, message: 'Vui lòng nhập liên kết theo dõi cho đơn vị khác.' };
  }

  const trackingUrl = buildTrackingUrl(
    input.carrierKey,
    trackingNumber,
    input.customTrackingUrl,
  );
  const now = new Date().toISOString();
  const initialEvent: ShipmentEvent = {
    status: 'picked_up',
    message: `${carrier.label} đã nhận kiện hàng.`,
    location: 'Kho xuất hàng',
    occurredAt: now,
  };

  const payload = await getPayload({ config });
  const doc = (await payload.update({
    collection: 'orders',
    id: input.docId,
    data: {
      shippingCarrierKey: input.carrierKey as ShipmentCarrierKey,
      shippingCarrier: carrier.key === 'other' ? 'Khác' : carrier.label,
      trackingNumber,
      trackingUrl,
      shipmentStatus: 'picked_up',
      shipmentEvents: [initialEvent],
      shippedAt: now,
      orderStatus: 'shipped',
    },
    depth: 0,
  })) as unknown as Order;

  return { ok: true, order: mapOrderToFulfillmentView(doc) };
}

/** Poll carrier (or mock) tracking and auto-complete order when delivered. */
export async function syncOrderShipment(docId: string | number): Promise<FulfillmentResult> {
  const existing = await getPayloadOrderById(docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };

  const extras = existing as Order & {
    confirmedAt?: string | null;
    shippedAt?: string | null;
    shippingCarrierKey?: string | null;
    trackingNumber?: string | null;
    shipmentStatus?: ShipmentStatus | null;
    shipmentEvents?: ShipmentEvent[] | null;
  };
  const trackingNumber =
    typeof extras.trackingNumber === 'string' ? extras.trackingNumber.trim() : '';
  const carrierKey =
    typeof extras.shippingCarrierKey === 'string' ? extras.shippingCarrierKey : '';

  if (!trackingNumber || !carrierKey) {
    return { ok: false, message: 'Đơn hàng chưa có thông tin vận chuyển.' };
  }
  if (isTerminalShipmentStatus(extras.shipmentStatus as ShipmentStatus | null)) {
    return { ok: true, order: mapOrderToFulfillmentView(existing) };
  }

  const lookup = await lookupShipmentStatus({
    carrierKey,
    trackingNumber,
    shippedAt: extras.shippedAt ?? null,
    currentStatus: extras.shipmentStatus as ShipmentStatus | null,
  });

  const mergedEvents = mergeShipmentEvents(
    parseShipmentEvents(extras.shipmentEvents),
    lookup.events,
  );

  const data: Record<string, unknown> = {
    shipmentStatus: lookup.status,
    shipmentEvents: mergedEvents,
  };

  if (lookup.status === 'delivered') {
    data.orderStatus = 'delivered';
    data.deliveredAt = new Date().toISOString();
  } else if (existing.orderStatus !== 'shipped' && existing.orderStatus !== 'delivered') {
    data.orderStatus = 'shipped';
  }

  const payload = await getPayload({ config });
  const doc = (await payload.update({
    collection: 'orders',
    id: docId,
    data,
    depth: 0,
  })) as Order;

  return { ok: true, order: mapOrderToFulfillmentView(doc) };
}

/** Admin cancels an order. Allowed from any non-terminal stage incl. shipped. Releases stock via afterChange hook. */
export async function cancelOrder(docId: string | number): Promise<FulfillmentResult> {
  const existing = await getPayloadOrderById(docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };
  if (existing.orderStatus === 'canceled') {
    return { ok: false, message: 'Đơn hàng đã bị hủy.' };
  }
  if (existing.orderStatus === 'delivered') {
    return { ok: false, message: 'Đơn đã giao không thể hủy — hãy dùng Hoàn tiền nếu cần.' };
  }

  const payload = await getPayload({ config });
  const doc = (await payload.update({
    collection: 'orders',
    id: docId,
    data: { orderStatus: 'canceled' },
    depth: 0,
  })) as Order;

  return { ok: true, order: mapOrderToFulfillmentView(doc) };
}

/** Admin records a full refund. v1: marks the order refunded; the actual money movement is out-of-band. */
export async function refundOrder(docId: string | number): Promise<FulfillmentResult> {
  const existing = await getPayloadOrderById(docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };
  if (existing.paymentStatus !== 'paid') {
    return { ok: false, message: 'Chỉ hoàn tiền cho đơn đã thanh toán.' };
  }

  const payload = await getPayload({ config });
  const doc = (await payload.update({
    collection: 'orders',
    id: docId,
    data: { paymentStatus: 'refunded' },
    depth: 0,
  })) as Order;

  return { ok: true, order: mapOrderToFulfillmentView(doc) };
}

/** Manual "delivered": fallback for shipped orders carrier sync missed, and the completion step for pickup orders. */
export async function markOrderDelivered(docId: string | number): Promise<FulfillmentResult> {
  const existing = await getPayloadOrderById(docId);
  if (!existing) return { ok: false, message: 'Không tìm thấy đơn hàng.' };
  if (existing.orderStatus === 'delivered') {
    return { ok: false, message: 'Đơn hàng đã được giao.' };
  }
  if (existing.orderStatus === 'canceled') {
    return { ok: false, message: 'Đơn hàng đã bị hủy.' };
  }

  const extras = existing as Order & { confirmedAt?: string | null };
  const isPickup = existing.deliveryMethod === 'PICKUP';
  const isShipped = existing.orderStatus === 'shipped';
  if (!isShipped && !(isPickup && extras.confirmedAt)) {
    return { ok: false, message: 'Chỉ đánh dấu đã giao cho đơn đang giao hoặc đơn nhận tại cửa hàng đã xác nhận.' };
  }

  const now = new Date().toISOString();
  const data: Record<string, unknown> = { orderStatus: 'delivered', deliveredAt: now };
  // COD: money is collected on delivery → mark paid at the same time.
  if (existing.paymentKind === 'cod' && existing.paymentStatus !== 'paid') {
    data.paymentStatus = 'paid';
    data.paidAt = now;
  }

  const payload = await getPayload({ config });
  const doc = (await payload.update({
    collection: 'orders',
    id: docId,
    data,
    depth: 0,
  })) as Order;

  return { ok: true, order: mapOrderToFulfillmentView(doc) };
}

/** Sync all in-transit orders (for cron / background job). */
export async function syncAllActiveShipments(): Promise<{
  synced: number;
  delivered: number;
  errors: string[];
}> {
  const payload = await getPayload({ config });
  const found = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { orderStatus: { equals: 'shipped' } },
        { trackingNumber: { exists: true } },
      ],
    },
    limit: 200,
    pagination: false,
    depth: 0,
  });

  let synced = 0;
  let delivered = 0;
  const errors: string[] = [];

  for (const doc of found.docs) {
    const result = await syncOrderShipment(doc.id);
    if (!result.ok) {
      errors.push(`#${(doc as Order).orderId}: ${result.message}`);
      continue;
    }
    synced += 1;
    if (result.order.shipmentStatus === 'delivered') delivered += 1;
  }

  return { synced, delivered, errors };
}

export function getPublicShipmentInfo(doc: Order): {
  carrierLabel: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shipmentStatus: ShipmentStatus | null;
  shipmentEvents: ShipmentEvent[];
  shippedAt: string | null;
  deliveredAt: string | null;
  orderStatus: string;
} {
  const view = mapOrderToFulfillmentView(doc);
  return {
    carrierLabel: view.shippingCarrierLabel,
    trackingNumber: view.trackingNumber,
    trackingUrl: view.trackingUrl,
    shipmentStatus: view.shipmentStatus,
    shipmentEvents: view.shipmentEvents,
    shippedAt: view.shippedAt,
    deliveredAt: view.deliveredAt,
    orderStatus: view.orderStatus,
  };
}
