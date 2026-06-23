// lib/payment-webhook-handler.ts — mark Payload orders paid (ShopNex-compatible collection)
import type { VerifiedWebhook } from '@/lib/payment-provider-types';
import { submitDropshipOrder } from '@/lib/dropshipping';
import { getDropshipSettings } from '@/lib/dropshipping/settings';
import { commitOrderInventory } from '@/lib/order-inventory';
import { markPayloadOrderPaid } from '@/lib/payload-orders';
import { logger } from '@/lib/logger';

export async function applyVerifiedWebhookPayment(
  data: VerifiedWebhook,
): Promise<{ matched: boolean }> {
  if (!Number.isInteger(data.orderCode) || !Number.isInteger(data.amount)) {
    throw new Error('Invalid webhook order reference');
  }

  if (!data.success) {
    return { matched: false };
  }

  const { matched, docId } = await markPayloadOrderPaid(data.orderCode, data.amount);
  if (!matched || docId === null) {
    return { matched: false };
  }

  await commitOrderInventory(docId);

  const dropship = await getDropshipSettings();
  if (dropship.enabled && dropship.autoSubmitOnPaid) {
    const config = await import('@payload-config');
    const { getPayload } = await import('payload');
    const payload = await getPayload({ config: config.default });
    const doc = await payload.findByID({ collection: 'orders', id: docId, depth: 0 });
    const items = Array.isArray(doc.lineItems)
      ? doc.lineItems.map((row) => {
          const item = row as Record<string, unknown>;
          return {
            productId: String(item.productId ?? ''),
            variantSku: typeof item.variantSku === 'string' ? item.variantSku : null,
            quantity: typeof item.quantity === 'number' ? item.quantity : 0,
          };
        })
      : [];
    await submitDropshipOrder({
      orderCode: data.orderCode,
      items,
      shippingAddress: typeof doc.shippingAddress === 'string' ? doc.shippingAddress : '',
    }).catch((err: unknown) => logger.warn({ err }, '[webhook] dropship stub failed'));
  }

  return { matched: true };
}
