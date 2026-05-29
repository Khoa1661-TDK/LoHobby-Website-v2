// lib/payment-webhook-handler.ts — shared logic for marking gateway orders PAID.
import type { VerifiedWebhook } from '@/lib/payment-provider-types';
import { prisma } from '@/src/lib/db-adapter';

export async function applyVerifiedWebhookPayment(
  data: VerifiedWebhook,
): Promise<{ matched: boolean }> {
  if (!Number.isInteger(data.orderCode) || !Number.isInteger(data.amount)) {
    throw new Error('Invalid webhook order reference');
  }

  if (!data.success) {
    return { matched: false };
  }

  const result = await prisma.order.updateMany({
    where: {
      orderCode: data.orderCode,
      amount: data.amount,
      status: { in: ['PENDING_ONLINE'] },
    },
    data: { status: 'PAID', paidAt: new Date() },
  });

  return { matched: result.count > 0 };
}
