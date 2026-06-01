// lib/payload-order-db.ts — fast SQL access to Payload orders (bypasses Payload hooks)
import 'server-only';

import { mapOrderToFulfillmentView, type OrderFulfillmentView } from '@/lib/order-fulfillment-view';
import { getPgPool } from '@/lib/pg-pool';
import type { Order } from '@/src/payload/payload-types';

export type PayloadOrderRow = {
  id: number;
  order_id: string;
  total_amount: string | number;
  payment_status: string;
  order_status: string;
  delivery_method: string | null;
  customer_name: string | null;
  buyer_email: string | null;
  phone_number: string | null;
  shipping_address: string | null;
  confirmed_at: Date | string | null;
  shipped_at: Date | string | null;
  delivered_at: Date | string | null;
  shipping_carrier_key: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  shipment_status: string | null;
  created_at: Date | string;
  paid_at: Date | string | null;
  payment_kind: string | null;
  inventory_adjusted: boolean | null;
};

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' ? value : null;
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function mapPayloadOrderRowToOrder(row: PayloadOrderRow): Order {
  return {
    id: row.id,
    orderId: row.order_id,
    totalAmount: toNumber(row.total_amount),
    paymentStatus: row.payment_status as Order['paymentStatus'],
    orderStatus: row.order_status as Order['orderStatus'],
    deliveryMethod: (row.delivery_method ?? undefined) as Order['deliveryMethod'],
    customerName: row.customer_name ?? undefined,
    buyerEmail: row.buyer_email ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    shippingAddress: row.shipping_address ?? undefined,
    confirmedAt: toIso(row.confirmed_at) ?? undefined,
    shippedAt: toIso(row.shipped_at) ?? undefined,
    deliveredAt: toIso(row.delivered_at) ?? undefined,
    shippingCarrierKey: (row.shipping_carrier_key ?? undefined) as Order['shippingCarrierKey'],
    shippingCarrier: row.shipping_carrier ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    trackingUrl: row.tracking_url ?? undefined,
    shipmentStatus: (row.shipment_status ?? undefined) as Order['shipmentStatus'],
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    paidAt: toIso(row.paid_at) ?? undefined,
    paymentKind: row.payment_kind ?? undefined,
    inventoryAdjusted: row.inventory_adjusted ?? false,
    updatedAt: toIso(row.created_at) ?? new Date().toISOString(),
  } as Order;
}

export function mapPayloadOrderRowToFulfillmentView(row: PayloadOrderRow): OrderFulfillmentView {
  return mapOrderToFulfillmentView(mapPayloadOrderRowToOrder(row));
}

export async function fetchPayloadOrderRowById(
  docId: string | number,
): Promise<PayloadOrderRow | null> {
  const pool = getPgPool();
  const result = await pool.query<PayloadOrderRow>(
    `SELECT
      id, order_id, total_amount, payment_status, order_status, delivery_method,
      customer_name, buyer_email, phone_number, shipping_address,
      confirmed_at, shipped_at, delivered_at, shipping_carrier_key, shipping_carrier,
      tracking_number, tracking_url, shipment_status, created_at, paid_at, payment_kind,
      inventory_adjusted
    FROM payload.orders
    WHERE id = $1
    LIMIT 1`,
    [docId],
  );
  return result.rows[0] ?? null;
}

/** Mark order paid via SQL — no Payload hooks, returns in milliseconds. */
export async function markPayloadOrderPaidByIdSql(
  docId: string | number,
): Promise<PayloadOrderRow | null> {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query(`SET LOCAL lock_timeout = '4s'`);
    const now = new Date();
    const result = await client.query<PayloadOrderRow>(
      `UPDATE payload.orders
       SET payment_status = 'paid',
           order_status = CASE WHEN order_status = 'pending' THEN 'processing' ELSE order_status END,
           paid_at = $1,
           updated_at = $1
       WHERE id = $2
         AND payment_status IS DISTINCT FROM 'paid'
         AND order_status IS DISTINCT FROM 'canceled'
       RETURNING
        id, order_id, total_amount, payment_status, order_status, delivery_method,
        customer_name, buyer_email, phone_number, shipping_address,
        confirmed_at, shipped_at, delivered_at, shipping_carrier_key, shipping_carrier,
        tracking_number, tracking_url, shipment_status, created_at, paid_at, payment_kind,
        inventory_adjusted`,
      [now, docId],
    );
    return result.rows[0] ?? null;
  } finally {
    client.release();
  }
}
