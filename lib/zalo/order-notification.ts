// lib/zalo/order-notification.ts — build + send the seller's new-order Zalo message
import type { Payload } from 'payload';
import type { Order } from '@/src/payload/payload-types';
import { absoluteUrl } from '@/lib/utils';
import { getZaloConfig, isConfigComplete, sendOaMessage } from '@/lib/zalo/oa-client';

function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')}₫`;
}

export function buildOrderMessage(order: Order): string {
  const lines: string[] = [];
  lines.push(`🛒 Đơn hàng mới #${order.orderId}`);
  lines.push(`Tổng tiền: ${formatVnd(order.totalAmount)}`);
  if (order.customerName) lines.push(`Khách: ${order.customerName}`);
  if (order.phoneNumber) lines.push(`SĐT: ${order.phoneNumber}`);

  const items = order.lineItems ?? [];
  if (items.length > 0) {
    lines.push('Sản phẩm:');
    for (const item of items) {
      lines.push(`• ${item.productTitle ?? item.productId} x${item.quantity}`);
    }
  }

  const payment = order.paymentMethodKey ?? order.paymentKind ?? 'N/A';
  lines.push(`Thanh toán: ${payment}`);
  lines.push(`Xem đơn: ${absoluteUrl(`/admin/collections/orders/${order.id}`)}`);
  return lines.join('\n');
}

export async function notifyNewOrder(args: { payload: Payload; order: Order }): Promise<void> {
  const { payload, order } = args;
  const config = await getZaloConfig(payload);
  if (!config.enabled || !isConfigComplete(config)) return;
  await sendOaMessage(payload, config, buildOrderMessage(order));
}
