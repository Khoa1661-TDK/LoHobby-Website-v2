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

  const messages: Record<OrderAction, string> = {
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
  return { ok: true, message: messages[action] };
}
