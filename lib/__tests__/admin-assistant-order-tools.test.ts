import { describe, expect, it, vi } from 'vitest';
import { findOrdersTool } from '@/lib/admin-assistant/tools/find-orders';
import { getOrderTool } from '@/lib/admin-assistant/tools/get-order';
import type { ToolContext } from '@/lib/admin-assistant/types';

function orderDoc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 11,
    orderId: '1042',
    customerName: 'Lan Nguyen',
    totalAmount: 250000,
    paymentStatus: 'paid',
    orderStatus: 'pending',
    paymentKind: 'payos',
    deliveryMethod: 'delivery',
    createdAt: '2026-08-01T00:00:00.000Z',
    lineItems: [],
    ...overrides,
  };
}

function ctxWith(docs: Record<string, unknown>[]): ToolContext {
  return {
    payload: { find: vi.fn().mockResolvedValue({ docs }) } as never,
    locale: 'vi',
  };
}

describe('findOrdersTool', () => {
  it('should return compact rows with the actions each order allows', async () => {
    const ctx = ctxWith([orderDoc()]);
    const outcome = await findOrdersTool.run({}, ctx);
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows[0]).toMatchObject({ docId: 11, orderCode: 1042, orderStatus: 'pending' });
    expect(rows[0]!.availableActions).toContain('confirm');
  });

  it('should filter by order status', async () => {
    const ctx = ctxWith([orderDoc(), orderDoc({ id: 12, orderId: '1043', orderStatus: 'delivered' })]);
    const outcome = await findOrdersTool.run({ status: 'delivered' }, ctx);
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.orderCode).toBe(1043);
  });

  it('should filter by a free-text query on customer name and order code', async () => {
    const ctx = ctxWith([orderDoc(), orderDoc({ id: 12, orderId: '1043', customerName: 'Minh Tran' })]);
    const outcome = await findOrdersTool.run({ query: 'minh' }, ctx);
    const rows = JSON.parse(outcome.content) as Array<Record<string, unknown>>;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.customerName).toBe('Minh Tran');
  });

  it('should not leak buyer contact details into the list', async () => {
    const ctx = ctxWith([orderDoc({ buyerEmail: 'a@b.com', phoneNumber: '0900000000' })]);
    const outcome = await findOrdersTool.run({}, ctx);
    expect(outcome.content).not.toContain('a@b.com');
    expect(outcome.content).not.toContain('0900000000');
  });
});

describe('getOrderTool', () => {
  it('should look an order up by its order code', async () => {
    const ctx = ctxWith([orderDoc()]);
    const outcome = await getOrderTool.run({ orderCode: 1042 }, ctx);
    const order = JSON.parse(outcome.content) as Record<string, unknown>;
    expect(order.orderCode).toBe(1042);
    expect(order.availableActions).toContain('confirm');
  });

  it('should error when neither identifier is given', async () => {
    const outcome = await getOrderTool.run({}, ctxWith([]));
    expect(outcome.content).toContain('ERROR:');
  });

  it('should error when the order does not exist', async () => {
    const outcome = await getOrderTool.run({ orderCode: 9999 }, ctxWith([]));
    expect(outcome.content).toContain('ERROR:');
  });
});
