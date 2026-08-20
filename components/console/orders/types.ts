// components/console/orders/types.ts
//
// Shared order data shapes for the console orders screens. Presentational
// fixtures for now; the data layer will implement these later.

import type { PillTone } from '@/components/console/ui/StatusPill';

export type PaymentStatus =
  | 'paid'
  | 'pending'
  | 'failed'
  | 'refunded';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export interface OrderRow {
  code: string;
  customer: string;
  total: string;
  payment: PaymentStatus;
  order: OrderStatus;
  date: string;
}

export interface OrderLineItem {
  name: string;
  meta: string;
  price: string;
}

export interface OrderTotalLine {
  label: string;
  amount: string;
  tone?: 'ink' | 'wait' | 'fail';
  code?: string;
}

export interface OrderTimelineStep {
  label: string;
  done: boolean;
  time: string;
}

export interface OrderDetail {
  code: string;
  payment: PaymentStatus;
  order: OrderStatus;
  createdAt: string;
  notice: string;
  items: OrderLineItem[];
  totals: OrderTotalLine[];
  grandTotal: string;
  timeline: OrderTimelineStep[];
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  shipping: {
    method: string;
    address: string;
  };
  paymentMethod: string;
  stock: string;
}

export const PAYMENT_TONE: Record<PaymentStatus, PillTone> = {
  paid: 'ok',
  pending: 'wait',
  failed: 'fail',
  refunded: 'ok',
};

export const ORDER_TONE: Record<OrderStatus, PillTone> = {
  pending: 'wait',
  processing: 'busy',
  shipped: 'busy',
  delivered: 'ok',
  cancelled: 'fail',
};

export const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  paid: 'Đã thanh toán',
  pending: 'Đang chờ',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

// Long-form status labels for the order DETAIL header, where there is room to
// spell the state out. The list and mobile boards use the short ORDER_LABEL
// below in their narrow status column — the design means both, so they are two
// maps rather than one compromise.
export const ORDER_LABEL_LONG: Record<OrderStatus, string> = {
  pending: 'Đang chờ xử lý',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
};

export const ORDER_LABEL: Record<OrderStatus, string> = {
  pending: 'Đang chờ',
  processing: 'Đang xử lý',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
};
