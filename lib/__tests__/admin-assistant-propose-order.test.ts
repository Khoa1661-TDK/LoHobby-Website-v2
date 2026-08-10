import { describe, expect, it, vi } from 'vitest';
import { proposeOrderActionTool } from '@/lib/admin-assistant/tools/propose-order-action';
import type { Proposal, ToolContext } from '@/lib/admin-assistant/types';

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

function ctx(docs: Record<string, unknown>[]): ToolContext {
  const update = vi.fn();
  return {
    payload: { find: vi.fn().mockResolvedValue({ docs }), update } as never,
    locale: 'vi',
  };
}

describe('proposeOrderActionTool', () => {
  it('should stage a confirm as a proposal without writing', async () => {
    const context = ctx([orderDoc()]);
    const outcome = await proposeOrderActionTool.run({ docId: 11, action: 'confirm' }, context);
    const proposal = outcome.emit as Proposal;
    expect(proposal).toMatchObject({ kind: 'orderAction', docId: 11, orderCode: 1042, action: 'confirm' });
    expect(proposal.summary).toContain('1042');
    expect((context.payload as unknown as { update: ReturnType<typeof vi.fn> }).update).not.toHaveBeenCalled();
  });

  it('should reject an action the order does not currently allow', async () => {
    const outcome = await proposeOrderActionTool.run(
      { docId: 11, action: 'refund' },
      ctx([orderDoc({ orderStatus: 'pending' })]),
    );
    expect(outcome.content).toContain('ERROR:');
    expect(outcome.emit).toBeUndefined();
  });

  it('should reject an unknown action', async () => {
    const outcome = await proposeOrderActionTool.run({ docId: 11, action: 'teleport' }, ctx([orderDoc()]));
    expect(outcome.content).toContain('ERROR:');
  });

  it('should require carrier and tracking for ship', async () => {
    const shippable = orderDoc({ orderStatus: 'processing', confirmedAt: '2026-08-02T00:00:00.000Z' });
    const outcome = await proposeOrderActionTool.run({ docId: 11, action: 'ship' }, ctx([shippable]));
    expect(outcome.content).toContain('ERROR:');
  });

  it('should stage a ship proposal carrying the shipment input', async () => {
    const shippable = orderDoc({ orderStatus: 'processing', confirmedAt: '2026-08-02T00:00:00.000Z' });
    const outcome = await proposeOrderActionTool.run(
      { docId: 11, action: 'ship', carrierKey: 'ghn', trackingNumber: 'GHN123' },
      ctx([shippable]),
    );
    const proposal = outcome.emit as Proposal;
    expect(proposal).toMatchObject({
      kind: 'orderAction',
      action: 'ship',
      input: { carrierKey: 'ghn', trackingNumber: 'GHN123' },
    });
  });

  it('should error when the order does not exist', async () => {
    const outcome = await proposeOrderActionTool.run({ docId: 99, action: 'confirm' }, ctx([]));
    expect(outcome.content).toContain('ERROR:');
  });
});
