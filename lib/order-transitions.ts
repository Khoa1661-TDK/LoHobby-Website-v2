// lib/order-transitions.ts — guarded order action set (pure) + dispatcher (Task 4 adds applyOrderAction)
import { deriveOrderStage, type OrderStage } from '@/lib/order-stage';

export type OrderAction =
  | 'mark_paid'
  | 'confirm'
  | 'ship'
  | 'sync_tracking'
  | 'mark_delivered'
  | 'cancel'
  | 'refund';

export type TransitionInput = {
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
  confirmedAt?: string | null;
  deliveryMethod?: string | null;
  // Reserved for Task 4's applyOrderAction dispatcher; not read by availableActions.
  trackingNumber?: string | null;
  shipmentStatus?: string | null;
};

export const ACTION_LABELS: Record<OrderAction, string> = {
  mark_paid: 'Đánh dấu đã thanh toán',
  confirm: 'Xác nhận đơn',
  ship: 'Tạo vận đơn',
  sync_tracking: 'Cập nhật vận chuyển',
  mark_delivered: 'Đánh dấu đã giao',
  cancel: 'Hủy đơn',
  refund: 'Hoàn tiền',
};

const isPaid = (o: TransitionInput): boolean => o.paymentStatus === 'paid';
const isPickup = (o: TransitionInput): boolean => o.deliveryMethod === 'PICKUP';

/**
 * The ordered list of valid actions for an order's current stage.
 * Index 0 is the primary action; the rest are secondary.
 */
export function availableActions(o: TransitionInput): OrderAction[] {
  const stage: OrderStage = deriveOrderStage(o);
  switch (stage) {
    case 'awaiting_payment':
      return ['mark_paid', 'cancel'];
    case 'to_confirm':
      return isPaid(o) ? ['confirm', 'cancel'] : ['confirm', 'mark_paid', 'cancel'];
    case 'packing':
      return isPickup(o) ? ['mark_delivered', 'cancel'] : ['ship', 'cancel'];
    case 'shipped': {
      const actions: OrderAction[] = ['sync_tracking', 'mark_delivered'];
      if (isPaid(o)) actions.push('refund');
      actions.push('cancel');
      return actions;
    }
    case 'delivered':
      return isPaid(o) ? ['refund'] : [];
    case 'payment_failed':
      return ['mark_paid', 'cancel'];
    case 'cancelled':
    case 'refunded':
    default:
      return [];
  }
}

const ACTION_VALUES = new Set<OrderAction>([
  'mark_paid', 'confirm', 'ship', 'sync_tracking', 'mark_delivered', 'cancel', 'refund',
]);

export function isOrderAction(value: unknown): value is OrderAction {
  return typeof value === 'string' && ACTION_VALUES.has(value as OrderAction);
}

export type ShipInput = { carrierKey: string; trackingNumber: string; customTrackingUrl?: string | null };
