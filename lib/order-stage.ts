// lib/order-stage.ts — single canonical order lifecycle stage (pure, no I/O)

export type OrderStage =
  | 'awaiting_payment'
  | 'to_confirm'
  | 'packing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'
  | 'payment_failed';

export type OrderStageInput = {
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
  confirmedAt?: string | null;
  deliveryMethod?: string | null;
};

/** The one function that decides "where is this order". Used by admin + storefront. */
export function deriveOrderStage(o: OrderStageInput): OrderStage {
  if (o.orderStatus === 'canceled') return 'cancelled';
  if (o.paymentStatus === 'refunded') return 'refunded';
  if (o.orderStatus === 'delivered') return 'delivered';
  if (o.orderStatus === 'shipped') return 'shipped';
  if (o.paymentStatus === 'failed') return 'payment_failed';
  if (o.confirmedAt) return 'packing';
  if (o.paymentStatus === 'paid') return 'to_confirm';
  if (o.paymentKind === 'cod' || o.paymentKind === 'manual_transfer') return 'to_confirm';
  return 'awaiting_payment';
}

export const STAGE_LABELS: Record<OrderStage, string> = {
  awaiting_payment: 'Chờ thanh toán',
  to_confirm: 'Cần xác nhận',
  packing: 'Đang chuẩn bị',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
  payment_failed: 'Thanh toán lỗi',
};

export const STAGE_BADGE: Record<OrderStage, string> = {
  awaiting_payment: 'bg-amber-100 text-amber-800 ring-amber-200',
  to_confirm: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  packing: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  shipped: 'bg-sky-100 text-sky-800 ring-sky-200',
  delivered: 'bg-teal-100 text-teal-800 ring-teal-200',
  cancelled: 'bg-rose-100 text-rose-800 ring-rose-200',
  refunded: 'bg-orange-100 text-orange-800 ring-orange-200',
  payment_failed: 'bg-rose-100 text-rose-800 ring-rose-200',
};

export type OrderTab = 'needs_action' | 'in_transit' | 'completed' | 'cancelled_refunded';

export function stageToTab(stage: OrderStage): OrderTab {
  switch (stage) {
    case 'shipped':
      return 'in_transit';
    case 'delivered':
      return 'completed';
    case 'cancelled':
    case 'refunded':
      return 'cancelled_refunded';
    default:
      return 'needs_action';
  }
}
