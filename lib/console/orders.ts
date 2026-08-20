// lib/console/orders.ts
//
// Orders adapter for the admin console. The reference implementation for a
// Payload-collection-backed area: a pure mapper the tests exercise, plus thin
// readers that fetch and map.
//
// The Payload order status vocabulary is not the console's: Payload spells the
// terminal state 'canceled', the console (and its design) spells it
// 'cancelled'. That translation lives here, not in a component.

import config from '@payload-config';
import { getPayload } from 'payload';
import type { Order } from '@/src/payload/payload-types';
import { getPayloadOrderById, listRecentOrders } from '@/lib/payload-orders';
import type {
  OrderDetail,
  OrderLineItem,
  OrderRow,
  OrderStatus,
  OrderTimelineStep,
  OrderTotalLine,
  PaymentStatus,
} from '@/components/console/orders/types';
import {
  formatDateTime,
  formatDayMonth,
  formatOrderCode,
  formatVndSymbol,
} from './format';

const PAYMENT_STATUSES: PaymentStatus[] = ['paid', 'pending', 'failed', 'refunded'];

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const GUEST_LABEL = 'Khách vãng lai';

const EM_DASH = '—';

function toPaymentStatus(value: unknown): PaymentStatus {
  return PAYMENT_STATUSES.includes(value as PaymentStatus)
    ? (value as PaymentStatus)
    : 'pending';
}

export function toOrderStatus(value: unknown): OrderStatus {
  if (value === 'canceled') return 'cancelled';
  return ORDER_STATUSES.includes(value as OrderStatus) ? (value as OrderStatus) : 'pending';
}

function resolveCustomerName(doc: Order): string {
  if (doc.customerName) return doc.customerName;
  const related = doc.customer;
  if (related && typeof related === 'object') {
    if (related.name) return related.name;
    if (related.email) return related.email;
  }
  if (doc.buyerEmail) return doc.buyerEmail;
  return GUEST_LABEL;
}

function resolveCustomerEmail(doc: Order): string {
  if (doc.buyerEmail) return doc.buyerEmail;
  const related = doc.customer;
  if (related && typeof related === 'object' && related.email) return related.email;
  return EM_DASH;
}

function resolveCustomerPhone(doc: Order): string {
  if (doc.phoneNumber) return doc.phoneNumber;
  const related = doc.customer;
  if (related && typeof related === 'object' && related.phone) return related.phone;
  return EM_DASH;
}

/** '20/08 09:14' — the compact stamp the detail timeline uses. */
function formatTimelineStamp(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const day = formatDayMonth(iso);
  if (day === EM_DASH) return EM_DASH;
  const full = formatDateTime(iso);
  const time = full.slice(full.length - 5);
  return `${day} ${time}`;
}

export function toOrderRow(doc: Order): OrderRow {
  return {
    code: formatOrderCode(doc.orderId),
    customer: resolveCustomerName(doc),
    total: formatVndSymbol(doc.totalAmount),
    payment: toPaymentStatus(doc.paymentStatus),
    order: toOrderStatus(doc.orderStatus),
    date: formatDayMonth(doc.createdAt),
  };
}

function toLineItems(doc: Order): OrderLineItem[] {
  const lines = doc.lineItems ?? [];
  return lines.map((line) => {
    const metaParts: string[] = [];
    if (line.variantName) metaParts.push(line.variantName);
    metaParts.push(`SL ${line.quantity}`);
    return {
      name: line.productTitle ?? line.productHandle ?? line.productId,
      meta: metaParts.join(' · '),
      price: formatVndSymbol(line.unitPrice * line.quantity),
    };
  });
}

function toTotals(doc: Order): OrderTotalLine[] {
  const totals: OrderTotalLine[] = [];

  if (doc.subtotalAmount) {
    totals.push({ label: 'Tạm tính', amount: formatVndSymbol(doc.subtotalAmount), tone: 'ink' });
  }
  if (doc.shippingAmount) {
    totals.push({
      label: 'Phí vận chuyển',
      amount: formatVndSymbol(doc.shippingAmount),
      tone: 'ink',
    });
  }
  if (doc.discountAmount) {
    const line: OrderTotalLine = {
      label: 'Mã giảm giá',
      amount: `−${formatVndSymbol(doc.discountAmount)}`,
      tone: 'fail',
    };
    if (doc.couponCode) line.code = doc.couponCode;
    totals.push(line);
  }
  if (doc.giftCardAmount) {
    totals.push({
      label: 'Thẻ quà tặng',
      amount: `−${formatVndSymbol(doc.giftCardAmount)}`,
      tone: 'fail',
    });
  }
  if (doc.taxAmount) {
    totals.push({ label: 'Thuế', amount: formatVndSymbol(doc.taxAmount), tone: 'ink' });
  }

  return totals;
}

function toTimeline(doc: Order): OrderTimelineStep[] {
  return [
    { label: 'Đã thanh toán', done: Boolean(doc.paidAt), time: formatTimelineStamp(doc.paidAt) },
    {
      label: 'Đã xác nhận',
      done: Boolean(doc.confirmedAt),
      time: formatTimelineStamp(doc.confirmedAt),
    },
    {
      label: 'Đã giao vận chuyển',
      done: Boolean(doc.shippedAt),
      time: formatTimelineStamp(doc.shippedAt),
    },
    {
      label: 'Đã nhận hàng',
      done: Boolean(doc.deliveredAt),
      time: formatTimelineStamp(doc.deliveredAt),
    },
  ];
}

function toNotice(doc: Order): string {
  const payment = toPaymentStatus(doc.paymentStatus);
  const order = toOrderStatus(doc.orderStatus);
  if (payment === 'paid' && (order === 'pending' || order === 'processing')) {
    return 'Đã thanh toán, chưa giao hàng — cần xử lý';
  }
  if (payment === 'pending') return 'Chờ thanh toán';
  if (payment === 'failed') return 'Thanh toán thất bại';
  if (payment === 'refunded') return 'Đã hoàn tiền';
  return '';
}

export function toOrderDetail(doc: Order): OrderDetail {
  return {
    code: formatOrderCode(doc.orderId),
    payment: toPaymentStatus(doc.paymentStatus),
    order: toOrderStatus(doc.orderStatus),
    createdAt: formatDateTime(doc.createdAt),
    notice: toNotice(doc),
    items: toLineItems(doc),
    totals: toTotals(doc),
    grandTotal: formatVndSymbol(doc.totalAmount),
    timeline: toTimeline(doc),
    customer: {
      name: resolveCustomerName(doc),
      email: resolveCustomerEmail(doc),
      phone: resolveCustomerPhone(doc),
    },
    shipping: {
      method:
        doc.shippingCarrier ?? (doc.deliveryMethod === 'PICKUP' ? 'Nhận tại cửa hàng' : EM_DASH),
      address: doc.shippingAddress ?? EM_DASH,
    },
    paymentMethod: doc.paymentKind ?? doc.paymentMethodKey ?? EM_DASH,
    stock: doc.inventoryAdjusted ? 'Đã trừ kho' : 'Chưa trừ kho',
  };
}

export async function listOrderRows(limit = 25): Promise<OrderRow[]> {
  const docs = await listRecentOrders({ status: 'all', limit });
  return docs.map(toOrderRow);
}

/**
 * The list header shows the full order count and how many are paid but not yet
 * shipped. Both are counted server-side so no documents are transferred.
 */
export async function countOrders(): Promise<{ total: number; unshipped: number }> {
  const payload = await getPayload({ config });
  const [all, unshipped] = await Promise.all([
    payload.count({ collection: 'orders' }),
    payload.count({
      collection: 'orders',
      where: {
        and: [
          { paymentStatus: { equals: 'paid' } },
          { orderStatus: { in: ['pending', 'processing'] } },
        ],
      },
    }),
  ]);
  return { total: all.totalDocs, unshipped: unshipped.totalDocs };
}

export async function getOrderDetail(id: string): Promise<OrderDetail | null> {
  const doc = await getPayloadOrderById(id);
  return doc ? toOrderDetail(doc) : null;
}
