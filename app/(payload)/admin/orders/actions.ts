// app/(payload)/admin/orders/actions.ts — Payload order status updates (ShopNex SoT)
'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin';
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
