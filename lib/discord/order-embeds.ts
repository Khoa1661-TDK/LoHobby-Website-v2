// lib/discord/order-embeds.ts — pure Discord embed/button builders for seller commands
import type { Order } from '@/src/payload/payload-types';
import { absoluteUrl } from '@/lib/utils';
import { availableActions, ACTION_LABELS, type OrderAction } from '@/lib/order-transitions';
import { formatVnd, type DiscordEmbed } from '@/lib/discord/order-notification';

export interface OrderActionButton {
  type: 2;
  style: 1 | 5;
  label: string;
  custom_id?: string;
  url?: string;
}
export interface OrderActionRow {
  type: 1;
  components: OrderActionButton[];
}

const ORDER_STATUS_VI: Record<string, string> = {
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  canceled: 'Đã hủy',
};
const PAYMENT_STATUS_VI: Record<string, string> = {
  pending: 'Chưa thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

function statusVi(value: string | null | undefined): string {
  return ORDER_STATUS_VI[value ?? ''] ?? value ?? '—';
}

export function buildOrdersListEmbed(orders: Order[], statusLabel: string): DiscordEmbed {
  if (orders.length === 0) {
    return {
      title: `📋 Đơn hàng — ${statusLabel}`,
      color: 0x64748b,
      fields: [{ name: '​', value: 'Không có đơn hàng nào.' }],
    };
  }
  const rows = orders.map((o) => {
    const code = o.orderId ?? String(o.id);
    const who = o.customerName ?? '—';
    const total = formatVnd(o.totalAmount ?? 0);
    return `\`#${code}\` · ${who} · ${total} · ${statusVi(o.orderStatus)}`;
  });
  return {
    title: `📋 Đơn hàng — ${statusLabel}`,
    color: 0x3b82f6,
    fields: [{ name: `${orders.length} đơn gần nhất`, value: rows.join('\n').slice(0, 1024) }],
  };
}

export function buildOrderDetailEmbed(order: Order): DiscordEmbed {
  const fields = [
    { name: 'Tổng tiền', value: formatVnd(order.totalAmount ?? 0), inline: true },
    { name: 'Thanh toán', value: PAYMENT_STATUS_VI[order.paymentStatus ?? ''] ?? '—', inline: true },
    { name: 'Trạng thái', value: statusVi(order.orderStatus), inline: true },
  ];
  if (order.customerName) fields.push({ name: 'Khách', value: order.customerName, inline: true });
  if (order.phoneNumber) fields.push({ name: 'SĐT', value: order.phoneNumber, inline: true });
  if (typeof order.shippingAddress === 'string' && order.shippingAddress) {
    fields.push({ name: 'Địa chỉ', value: order.shippingAddress.slice(0, 1024), inline: false });
  }
  const items = Array.isArray(order.lineItems) ? order.lineItems : [];
  if (items.length > 0) {
    const lines = items.map((i) => `• ${i.productTitle ?? i.productId} x${i.quantity}`);
    fields.push({ name: 'Sản phẩm', value: lines.join('\n').slice(0, 1024), inline: false });
  }
  return {
    title: `🧾 Đơn hàng #${order.orderId}`,
    url: absoluteUrl(`/admin/collections/orders/${order.id}`),
    color: 0x22c55e,
    fields,
  };
}

export function buildOrderActionComponents(order: Order): OrderActionRow[] {
  const actions = availableActions({
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    paymentKind: order.paymentKind,
    deliveryMethod: order.deliveryMethod,
  } as Parameters<typeof availableActions>[0]);

  const buttons: OrderActionButton[] = actions.slice(0, 5).map((action: OrderAction) => {
    if (action === 'ship') {
      return {
        type: 2,
        style: 5,
        label: ACTION_LABELS[action],
        url: absoluteUrl(`/admin/collections/orders/${order.id}`),
      };
    }
    return {
      type: 2,
      style: 1,
      label: ACTION_LABELS[action],
      custom_id: `order_action:${action}:${order.id}`,
    };
  });

  return buttons.length > 0 ? [{ type: 1, components: buttons }] : [];
}

export function buildSalesEmbed(periodLabel: string, count: number, total: number): DiscordEmbed {
  return {
    title: `📊 Doanh số — ${periodLabel}`,
    color: 0x8b5cf6,
    fields: [
      { name: 'Số đơn', value: String(count), inline: true },
      { name: 'Doanh thu', value: formatVnd(total), inline: true },
    ],
  };
}
