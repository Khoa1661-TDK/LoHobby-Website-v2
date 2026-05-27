// app/admin/orders/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { OrderStatus } from '@/generated/prisma/enums';
import { requireAdmin } from '@/lib/admin';
import { prisma } from '@/lib/prisma';

export type UpdateOrderStatusResult =
  | { ok: true; status: OrderStatus }
  | { ok: false; message: string };

const ORDER_STATUS_VALUES = new Set<OrderStatus>(Object.values(OrderStatus));

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === 'string' && ORDER_STATUS_VALUES.has(value as OrderStatus);
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<UpdateOrderStatusResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, message: 'Bạn không có quyền cập nhật đơn hàng.' };
  }

  if (typeof orderId !== 'string' || orderId.length === 0) {
    return { ok: false, message: 'Thiếu mã đơn hàng.' };
  }
  if (!isOrderStatus(nextStatus)) {
    return { ok: false, message: 'Trạng thái đơn hàng không hợp lệ.' };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: nextStatus,
      paidAt: nextStatus === OrderStatus.PAID ? new Date() : undefined,
    },
  });

  revalidatePath('/admin/orders');
  revalidatePath('/admin');

  return { ok: true, status: nextStatus };
}
