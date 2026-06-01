// app/(payload)/admin/orders/fulfillment-actions.ts — server actions for order fulfillment
'use server';

import { revalidatePath } from 'next/cache';
import {
  assignShipment,
  confirmOrder,
  syncOrderShipment,
  type AssignShipmentInput,
} from '@/lib/order-fulfillment';
import { requireAdmin } from '@/lib/admin';

export type FulfillmentActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export async function confirmOrderAction(
  orderDocId: string | number,
): Promise<FulfillmentActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Bạn không có quyền thực hiện thao tác này.' };
  }

  const result = await confirmOrder(orderDocId);
  if (!result.ok) return result;

  revalidatePath('/admin/orders');
  revalidatePath('/admin/collections/orders');
  revalidatePath(`/admin/collections/orders/${orderDocId}`);
  revalidatePath(`/profile/orders/${result.order.orderCode}`);

  return { ok: true, message: `Đã xác nhận đơn #${result.order.orderCode}.` };
}

export async function assignShipmentAction(
  input: AssignShipmentInput,
): Promise<FulfillmentActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Bạn không có quyền thực hiện thao tác này.' };
  }

  const result = await assignShipment(input);
  if (!result.ok) return result;

  revalidatePath('/admin/orders');
  revalidatePath('/admin/collections/orders');
  revalidatePath(`/admin/collections/orders/${input.docId}`);
  revalidatePath(`/profile/orders/${result.order.orderCode}`);

  return {
    ok: true,
    message: `Đã giao cho ${result.order.shippingCarrierLabel} — mã ${result.order.trackingNumber}.`,
  };
}

export async function syncShipmentAction(
  orderDocId: string | number,
): Promise<FulfillmentActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Bạn không có quyền thực hiện thao tác này.' };
  }

  const result = await syncOrderShipment(orderDocId);
  if (!result.ok) return result;

  revalidatePath('/admin/orders');
  revalidatePath('/admin/collections/orders');
  revalidatePath(`/admin/collections/orders/${orderDocId}`);
  revalidatePath(`/profile/orders/${result.order.orderCode}`);

  const statusMsg =
    result.order.shipmentStatus === 'delivered'
      ? 'Đơn hàng đã được tự động hoàn tất (đã giao).'
      : `Trạng thái vận chuyển: ${result.order.shipmentStatus ?? '—'}`;

  return { ok: true, message: statusMsg };
}
