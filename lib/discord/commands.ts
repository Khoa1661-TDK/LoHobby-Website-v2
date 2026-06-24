// lib/discord/commands.ts — Discord slash-command dispatcher + order-action mapping
import {
  listRecentOrders,
  getPayloadOrderByCode,
  getSalesSummary,
} from '@/lib/payload-orders';
import {
  buildOrdersListEmbed,
  buildOrderDetailEmbed,
  buildOrderActionComponents,
  buildSalesEmbed,
} from '@/lib/discord/order-embeds';
import {
  markOrderAsPaid,
  confirmOrder,
  syncOrderShipment,
  cancelOrder,
  refundOrder,
  markOrderDelivered,
  type FulfillmentResult,
} from '@/lib/order-fulfillment';
import { isOrderAction, type OrderAction } from '@/lib/order-transitions';
import type { Order } from '@/src/payload/payload-types';
import type { PayloadOrderStatus } from '@/lib/payload-orders';

export type DiscordResponse = { type: number; data?: Record<string, unknown> };
export type SlashInteraction = {
  type: number;
  data?: { name?: string; options?: Array<{ name: string; value: unknown }> };
  member?: { user?: { id?: string } };
};

const STATUS_FILTER_LABEL: Record<string, string> = {
  all: 'Tất cả',
  pending: 'Chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  canceled: 'Đã hủy',
};

const SUCCESS_LABEL: Record<OrderAction, string> = {
  mark_paid: 'Đã đánh dấu thanh toán đơn',
  confirm: 'Đã xác nhận đơn',
  ship: 'Đã tạo vận đơn',
  sync_tracking: 'Đã cập nhật vận chuyển đơn',
  mark_delivered: 'Đã đánh dấu giao thành công đơn',
  cancel: 'Đã hủy đơn',
  refund: 'Đã hoàn tiền đơn',
};

function ephemeral(content: string): DiscordResponse {
  return { type: 4, data: { content, flags: 64 } };
}

function getOption(interaction: SlashInteraction, name: string): unknown {
  return interaction.data?.options?.find((o) => o.name === name)?.value;
}

export function parseOrderAction(
  customId: string,
): { action: OrderAction; docId: string } | null {
  if (customId.startsWith('confirm_order:')) {
    return { action: 'confirm', docId: customId.slice('confirm_order:'.length) };
  }
  if (customId.startsWith('order_action:')) {
    const [, action, docId] = customId.split(':');
    if (action && docId && isOrderAction(action)) {
      return { action, docId };
    }
  }
  return null;
}

export async function applyOrderActionByKey(
  action: OrderAction,
  docId: string,
): Promise<FulfillmentResult> {
  switch (action) {
    case 'mark_paid':
      return markOrderAsPaid(docId);
    case 'confirm':
      return confirmOrder(docId);
    case 'sync_tracking':
      return syncOrderShipment(docId);
    case 'mark_delivered':
      return markOrderDelivered(docId);
    case 'cancel':
      return cancelOrder(docId);
    case 'refund':
      return refundOrder(docId);
    case 'ship':
    default:
      return { ok: false, message: 'Vui lòng tạo vận đơn trong trang quản trị.' };
  }
}

export function successMessage(action: OrderAction, orderCode: number): string {
  return `✅ ${SUCCESS_LABEL[action]} #${orderCode}.`;
}

export async function handleSlashCommand(
  interaction: SlashInteraction,
  ctx: { allowedUserIds: string[] },
): Promise<DiscordResponse> {
  const userId = interaction.member?.user?.id ?? '';
  if (!ctx.allowedUserIds.includes(userId)) {
    return ephemeral('Bạn không có quyền dùng lệnh này.');
  }

  const name = interaction.data?.name ?? '';

  if (name === 'orders') {
    const status = (typeof getOption(interaction, 'status') === 'string'
      ? (getOption(interaction, 'status') as string)
      : 'all') as PayloadOrderStatus | 'all';
    const limitRaw = getOption(interaction, 'limit');
    const limit = typeof limitRaw === 'number' ? limitRaw : 10;
    const orders = await listRecentOrders({ status, limit });
    return { type: 4, data: { embeds: [buildOrdersListEmbed(orders, STATUS_FILTER_LABEL[status] ?? 'Tất cả')], flags: 64 } };
  }

  if (name === 'order') {
    const codeRaw = getOption(interaction, 'code');
    const code = Number.parseInt(String(codeRaw ?? ''), 10);
    if (!Number.isInteger(code)) return ephemeral('Mã đơn không hợp lệ.');
    const order = (await getPayloadOrderByCode(code)) as Order | null;
    if (!order) return ephemeral(`Không tìm thấy đơn hàng #${code}.`);
    return {
      type: 4,
      data: {
        embeds: [buildOrderDetailEmbed(order)],
        components: buildOrderActionComponents(order),
        flags: 64,
      },
    };
  }

  if (name === 'sales') {
    const period = getOption(interaction, 'period') === 'week' ? 'week' : 'today';
    const since = new Date();
    if (period === 'week') {
      since.setDate(since.getDate() - 7);
    } else {
      since.setHours(0, 0, 0, 0);
    }
    const summary = await getSalesSummary({ since });
    const label = period === 'week' ? '7 ngày qua' : 'Hôm nay';
    return { type: 4, data: { embeds: [buildSalesEmbed(label, summary.count, summary.total)], flags: 64 } };
  }

  return ephemeral('Lệnh không được hỗ trợ.');
}
