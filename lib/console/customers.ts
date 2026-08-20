// lib/console/customers.ts
//
// Customers adapter for the admin console: a pure mapper over Payload
// store-customer documents plus a thin reader that tallies lifetime order
// totals from the Payload orders collection (the order source of truth).

import config from '@payload-config';
import { getPayload } from 'payload';
import type { Order, StoreCustomer } from '@/src/payload/payload-types';
import type { CustomerRow } from '@/components/console/customers/CustomerList';
import { formatVndSymbol } from './format';

const GUEST_LABEL = 'Khách vãng lai';

const EM_DASH = '—';

export type CustomerTotals = { orderCount: number; totalSpentVnd: number };

export function toCustomerRow(doc: StoreCustomer, totals: CustomerTotals | undefined): CustomerRow {
  const name = doc.name || doc.email || GUEST_LABEL;
  const contact = doc.email || doc.phone || EM_DASH;
  return {
    id: String(doc.id),
    name,
    contact,
    orderCount: totals?.orderCount ?? 0,
    totalSpent: formatVndSymbol(totals?.totalSpentVnd ?? 0),
  };
}

/**
 * Tally one order's contribution per customer id. At depth 0 the `customer`
 * relationship is a bare numeric id; at depth 1 it is the document itself.
 */
function tallyOrder(order: Order, totals: Map<number, CustomerTotals>): void {
  const customer = order.customer;
  const id = typeof customer === 'number' ? customer : customer?.id;
  if (typeof id !== 'number') return;
  const entry = totals.get(id) ?? { orderCount: 0, totalSpentVnd: 0 };
  if (order.orderStatus !== 'canceled') {
    entry.orderCount += 1;
    if (order.paymentStatus === 'paid') {
      entry.totalSpentVnd += order.totalAmount ?? 0;
    }
  }
  totals.set(id, entry);
}

export function tallyCustomerTotals(orders: Order[]): Map<number, CustomerTotals> {
  const totals = new Map<number, CustomerTotals>();
  for (const order of orders) {
    tallyOrder(order, totals);
  }
  return totals;
}

export async function listCustomerRows(limit = 100): Promise<CustomerRow[]> {
  const payload = await getPayload({ config });
  const [customers, orders] = await Promise.all([
    payload.find({
      collection: 'store-customers',
      sort: '-createdAt',
      limit,
      depth: 0,
    }),
    payload.find({
      collection: 'orders',
      sort: '-createdAt',
      limit: 5000,
      pagination: false,
      depth: 0,
    }),
  ]);

  const totals = tallyCustomerTotals(orders.docs);
  return customers.docs.map((doc) => toCustomerRow(doc, totals.get(doc.id)));
}
