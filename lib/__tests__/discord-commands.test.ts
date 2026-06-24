import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/payload-orders', () => ({
  listRecentOrders: vi.fn(),
  getPayloadOrderByCode: vi.fn(),
  getSalesSummary: vi.fn(),
}));
vi.mock('@/lib/order-fulfillment', () => ({
  confirmOrder: vi.fn(),
  cancelOrder: vi.fn(),
  markOrderAsPaid: vi.fn(),
  syncOrderShipment: vi.fn(),
  refundOrder: vi.fn(),
  markOrderDelivered: vi.fn(),
}));

import { listRecentOrders, getPayloadOrderByCode, getSalesSummary } from '@/lib/payload-orders';
import { confirmOrder, cancelOrder, type OrderFulfillmentView } from '@/lib/order-fulfillment';
import { parseOrderAction, applyOrderActionByKey, handleSlashCommand } from '@/lib/discord/commands';

const listRecentOrdersMock = vi.mocked(listRecentOrders);
const getPayloadOrderByCodeMock = vi.mocked(getPayloadOrderByCode);
const getSalesSummaryMock = vi.mocked(getSalesSummary);
const confirmOrderMock = vi.mocked(confirmOrder);
const cancelOrderMock = vi.mocked(cancelOrder);

beforeEach(() => {
  vi.clearAllMocks();
  listRecentOrdersMock.mockResolvedValue([]);
  getSalesSummaryMock.mockResolvedValue({ count: 0, total: 0 });
});

describe('parseOrderAction', () => {
  it('should parse the order_action custom_id', () => {
    expect(parseOrderAction('order_action:cancel:42')).toEqual({ action: 'cancel', docId: '42' });
  });
  it('should map the legacy confirm_order custom_id to confirm', () => {
    expect(parseOrderAction('confirm_order:42')).toEqual({ action: 'confirm', docId: '42' });
  });
  it('should return null for unknown ids', () => {
    expect(parseOrderAction('whatever:1')).toBeNull();
    expect(parseOrderAction('order_action:not_an_action:1')).toBeNull();
  });
});

describe('applyOrderActionByKey', () => {
  it('should call confirmOrder for the confirm action', async () => {
    confirmOrderMock.mockResolvedValue({
      ok: true,
      order: { orderCode: 1 } as unknown as OrderFulfillmentView,
    });
    await applyOrderActionByKey('confirm', '42');
    expect(confirmOrderMock).toHaveBeenCalledWith('42');
  });
  it('should not perform ship as a one-click action', async () => {
    const res = await applyOrderActionByKey('ship', '42');
    expect(res.ok).toBe(false);
  });
});

function slash(name: string, options: Array<{ name: string; value: unknown }>, userId = '1') {
  return { type: 2, data: { name, options }, member: { user: { id: userId } } };
}

describe('handleSlashCommand', () => {
  const ctx = { allowedUserIds: ['1'] };

  it('should reject a user not in the allowlist', async () => {
    const res = await handleSlashCommand(slash('orders', [], '999'), ctx);
    expect(res.type).toBe(4);
    expect(res.data?.flags).toBe(64);
    expect(listRecentOrdersMock).not.toHaveBeenCalled();
  });

  it('should route /orders to listRecentOrders with the status filter', async () => {
    await handleSlashCommand(slash('orders', [{ name: 'status', value: 'pending' }, { name: 'limit', value: 5 }]), ctx);
    expect(listRecentOrdersMock).toHaveBeenCalledWith({ status: 'pending', limit: 5 });
  });

  it('should return a not-found message when /order code is missing', async () => {
    getPayloadOrderByCodeMock.mockResolvedValue(null);
    const res = await handleSlashCommand(slash('order', [{ name: 'code', value: '9999' }]), ctx);
    expect(JSON.stringify(res.data)).toContain('Không tìm thấy');
  });

  it('should route /sales to getSalesSummary', async () => {
    await handleSlashCommand(slash('sales', [{ name: 'period', value: 'today' }]), ctx);
    expect(getSalesSummaryMock).toHaveBeenCalledTimes(1);
  });
});
