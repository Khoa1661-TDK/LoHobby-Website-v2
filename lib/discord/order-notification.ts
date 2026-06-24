// lib/discord/order-notification.ts — build the seller's new-order Discord message
import type { Payload } from 'payload';
import type { Order } from '@/src/payload/payload-types';
import { absoluteUrl } from '@/lib/utils';
import { getDiscordConfig, isDiscordConfigComplete, sendChannelMessage } from '@/lib/discord/client';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color: number;
  fields: DiscordEmbedField[];
}

export interface DiscordButton {
  type: 2;
  style: 1;
  label: string;
  custom_id: string;
}

export interface DiscordActionRow {
  type: 1;
  components: DiscordButton[];
}

export function formatVnd(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')}₫`;
}

export function buildOrderEmbed(order: Order): DiscordEmbed {
  const fields: DiscordEmbedField[] = [];
  fields.push({ name: 'Tổng tiền', value: formatVnd(order.totalAmount), inline: true });
  if (order.customerName) fields.push({ name: 'Khách', value: order.customerName, inline: true });
  if (order.phoneNumber) fields.push({ name: 'SĐT', value: order.phoneNumber, inline: true });

  const payment = order.paymentMethodKey ?? order.paymentKind ?? 'N/A';
  fields.push({ name: 'Thanh toán', value: payment, inline: true });

  const items = order.lineItems ?? [];
  if (items.length > 0) {
    const lines = items.map((item) => `• ${item.productTitle ?? item.productId} x${item.quantity}`);
    fields.push({ name: 'Sản phẩm', value: lines.join('\n') });
  }

  return {
    title: `🛒 Đơn hàng mới #${order.orderId}`,
    url: absoluteUrl(`/admin/collections/orders/${order.id}`),
    color: 0x22c55e,
    fields,
  };
}

export function buildConfirmComponents(order: Order): DiscordActionRow[] {
  return [
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: '✅ Xác nhận đơn', custom_id: `confirm_order:${order.id}` },
      ],
    },
  ];
}

export async function notifyNewOrder(args: { payload: Payload; order: Order }): Promise<void> {
  const { payload, order } = args;
  const config = await getDiscordConfig(payload);
  if (!config.enabled || !isDiscordConfigComplete(config)) return;
  await sendChannelMessage(config, {
    embeds: [buildOrderEmbed(order)],
    components: buildConfirmComponents(order),
  });
}
