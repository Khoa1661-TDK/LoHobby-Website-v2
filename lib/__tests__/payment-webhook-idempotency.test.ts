import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VerifiedWebhook } from '@/lib/payment-provider-types';

// Mock the fulfillment dependencies so we can observe how a replayed webhook
// flows through applyVerifiedWebhookPayment without touching a database.
vi.mock('@/lib/payload-orders', () => ({ markPayloadOrderPaid: vi.fn() }));
vi.mock('@/lib/order-inventory', () => ({ commitOrderInventory: vi.fn() }));
vi.mock('@/lib/dropshipping/settings', () => ({
  getDropshipSettings: vi.fn(async () => ({
    enabled: false,
    autoSubmitOnPaid: false,
  })),
}));
vi.mock('@/lib/dropshipping', () => ({ submitDropshipOrder: vi.fn() }));

import { markPayloadOrderPaid } from '@/lib/payload-orders';
import { commitOrderInventory } from '@/lib/order-inventory';
import { applyVerifiedWebhookPayment } from '@/lib/payment-webhook-handler';

const markPaid = vi.mocked(markPayloadOrderPaid);
const commitInventory = vi.mocked(commitOrderInventory);

afterEach(() => {
  vi.clearAllMocks();
});

const webhook: VerifiedWebhook = {
  orderCode: 1001,
  amount: 50_000,
  success: true,
};

describe('applyVerifiedWebhookPayment idempotency', () => {
  it('should fulfill and commit inventory exactly once when the same webhook is delivered twice', async () => {
    // First delivery: the order is still pending, so markPayloadOrderPaid
    // matches it (its WHERE clause filters paymentStatus = 'pending').
    markPaid.mockResolvedValueOnce({ matched: true, docId: 7 });
    // Replay: the order is now 'paid', so the pending-scoped lookup finds
    // nothing — markPayloadOrderPaid reports no match.
    markPaid.mockResolvedValueOnce({ matched: false, docId: null });

    const first = await applyVerifiedWebhookPayment(webhook);
    const replay = await applyVerifiedWebhookPayment(webhook);

    expect(first.matched).toBe(true);
    expect(replay.matched).toBe(false);

    // Inventory must be committed once, not once per delivery.
    expect(commitInventory).toHaveBeenCalledTimes(1);
    expect(commitInventory).toHaveBeenCalledWith(7);
  });

  it('should not commit inventory for a non-success settlement', async () => {
    const result = await applyVerifiedWebhookPayment({ ...webhook, success: false });

    expect(result.matched).toBe(false);
    expect(markPaid).not.toHaveBeenCalled();
    expect(commitInventory).not.toHaveBeenCalled();
  });

  it('should reject a webhook with a non-integer order reference', async () => {
    await expect(
      applyVerifiedWebhookPayment({ ...webhook, orderCode: 1.5 }),
    ).rejects.toThrow(/Invalid webhook order reference/);
    expect(commitInventory).not.toHaveBeenCalled();
  });
});
