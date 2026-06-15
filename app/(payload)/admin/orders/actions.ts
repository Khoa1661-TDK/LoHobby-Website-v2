// app/(payload)/admin/orders/actions.ts — Payload order status updates (ShopNex SoT)
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
import {
  assignShipment,
  cancelOrder,
  confirmOrder,
  markOrderAsPaid,
  markOrderDelivered,
  refundOrder,
  syncOrderShipment,
  type FulfillmentResult,
} from '@/lib/order-fulfillment';
import { isOrderAction, type OrderAction, type ShipInput } from '@/lib/order-transitions';
import {
  mapStorefrontStatusToPayloadFields,
  type StorefrontOrderStatus,
} from '@/lib/payload-order-storefront';
import { updatePayloadOrderStatus } from '@/lib/payload-orders';

export type UpdateOrderStatusResult =
  | { ok: true; status: StorefrontOrderStatus }
  | { ok: false; message: string };

const STOREFRONT_STATUS_VALUES = new Set<StorefrontOrderStatus>([
  'PENDING',
  'PENDING_COD',
  'PENDING_ONLINE',
  'PENDING_TRANSFER',
  'PAID',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]);

function isStorefrontOrderStatus(value: unknown): value is StorefrontOrderStatus {
  return typeof value === 'string' && STOREFRONT_STATUS_VALUES.has(value as StorefrontOrderStatus);
}

/** Update a Payload order by doc id using combined storefront status labels. */
export async function updateOrderStatus(
  orderDocId: string | number,
  nextStatus: StorefrontOrderStatus,
): Promise<UpdateOrderStatusResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Bạn không có quyền cập nhật đơn hàng.' };
  }

  if (
    (typeof orderDocId !== 'string' && typeof orderDocId !== 'number') ||
    String(orderDocId).length === 0
  ) {
    return { ok: false, message: 'Thiếu mã đơn hàng.' };
  }
  if (!isStorefrontOrderStatus(nextStatus)) {
    return { ok: false, message: 'Trạng thái đơn hàng không hợp lệ.' };
  }

  const fields = mapStorefrontStatusToPayloadFields(nextStatus);
  const result = await updatePayloadOrderStatus({
    docId: orderDocId,
    ...fields,
  });

  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidatePath('/admin/collections/orders');
  revalidatePath(`/admin/collections/orders/${orderDocId}`);
  revalidatePath('/admin');

  return { ok: true, status: nextStatus };
}

export type RunOrderActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/** Dispatch an action to its fulfillment operation. Each op re-fetches and re-guards internally. */
async function dispatchOrderAction(
  docId: string | number,
  action: OrderAction,
  input?: ShipInput,
): Promise<FulfillmentResult> {
  switch (action) {
    case 'mark_paid':
      return markOrderAsPaid(docId);
    case 'confirm':
      return confirmOrder(docId);
    case 'ship':
      if (!input) return { ok: false, message: 'Thiếu thông tin vận chuyển.' };
      return assignShipment({ docId, ...input });
    case 'sync_tracking':
      return syncOrderShipment(docId);
    case 'mark_delivered':
      return markOrderDelivered(docId);
    case 'cancel':
      return cancelOrder(docId);
    case 'refund':
      return refundOrder(docId);
    default:
      return { ok: false, message: 'Thao tác không hợp lệ.' };
  }
}

/** Single entry point for every admin order action. */
export async function runOrderAction(
  docId: string | number,
  action: string,
  input?: ShipInput,
): Promise<RunOrderActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Bạn không có quyền thực hiện thao tác này.' };
  }
  if (!isOrderAction(action)) {
    return { ok: false, message: 'Thao tác không hợp lệ.' };
  }

  const result = await dispatchOrderAction(docId, action, input);
  if (!result.ok) return result;

  revalidatePath('/admin/orders');
  revalidatePath('/admin/collections/orders');
  revalidatePath(`/admin/collections/orders/${docId}`);
  revalidatePath(`/profile/orders/${result.order.orderCode}`);

  const messages: Record<string, string> = {
    mark_paid: `Đã đánh dấu thanh toán đơn #${result.order.orderCode}.`,
    confirm: `Đã xác nhận đơn #${result.order.orderCode}.`,
    ship: `Đã giao cho ${result.order.shippingCarrierLabel} — mã ${result.order.trackingNumber}.`,
    sync_tracking:
      result.order.shipmentStatus === 'delivered'
        ? 'Đơn hàng đã tự động hoàn tất (đã giao).'
        : `Trạng thái vận chuyển: ${result.order.shipmentStatus ?? '—'}.`,
    mark_delivered: `Đã đánh dấu giao thành công đơn #${result.order.orderCode}.`,
    cancel: `Đã hủy đơn #${result.order.orderCode}.`,
    refund: `Đã hoàn tiền đơn #${result.order.orderCode}.`,
  };
  return { ok: true, message: messages[action] ?? 'Đã cập nhật đơn hàng.' };
}
