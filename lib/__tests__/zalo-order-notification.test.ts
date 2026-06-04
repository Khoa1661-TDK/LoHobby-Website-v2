import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Payload } from 'payload';
import type { Order } from '@/src/payload/payload-types';

const { sendOaMessage, getZaloConfig, isConfigComplete } = vi.hoisted(() => ({
  sendOaMessage: vi.fn(),
  getZaloConfig: vi.fn(),
  isConfigComplete: vi.fn(),
}));

vi.mock('@/lib/zalo/oa-client', () => ({
  sendOaMessage,
  getZaloConfig,
  isConfigComplete,
}));

import { notifyNewOrder } from '@/lib/zalo/order-notification';

const order = { id: 1, orderId: '1', totalAmount: 1000 } as Order;
const payload = {} as Payload;

describe('notifyNewOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not send when notifications are disabled', async () => {
    getZaloConfig.mockResolvedValue({ enabled: false });
    isConfigComplete.mockReturnValue(true);
    await notifyNewOrder({ payload, order });
    expect(sendOaMessage).not.toHaveBeenCalled();
  });

  it('should not send when the config is incomplete', async () => {
    getZaloConfig.mockResolvedValue({ enabled: true });
    isConfigComplete.mockReturnValue(false);
    await notifyNewOrder({ payload, order });
    expect(sendOaMessage).not.toHaveBeenCalled();
  });

  it('should send when enabled and config is complete', async () => {
    getZaloConfig.mockResolvedValue({ enabled: true });
    isConfigComplete.mockReturnValue(true);
    await notifyNewOrder({ payload, order });
    expect(sendOaMessage).toHaveBeenCalledOnce();
  });
});
