// lib/order-inventory.ts — stock adjustments tied to Payload `orders`
import config from '@payload-config';
import type { Payload } from 'payload';
import { getPayload } from 'payload';
import { ORDER_INVENTORY_CONTEXT } from '@/lib/payload-hooks';
import { revalidateCatalogCache } from '@/lib/payload-products';
import { decrementOrderInventory, restockOrderInventory } from '@/lib/inventory';

type OrderLine = { productId: string | null; variantSku: string | null; quantity: number };

function linesFromPayloadDoc(doc: {
  lineItems?: unknown;
  inventoryAdjusted?: boolean | null;
}): OrderLine[] {
  if (!Array.isArray(doc.lineItems)) return [];
  const lines: OrderLine[] = [];
  for (const row of doc.lineItems) {
    if (typeof row !== 'object' || row === null) continue;
    const item = row as Record<string, unknown>;
    const productId = typeof item.productId === 'string' ? item.productId : null;
    const sku = typeof item.variantSku === 'string' ? item.variantSku : null;
    const qty = typeof item.quantity === 'number' ? item.quantity : 0;
    if (qty > 0) lines.push({ productId, variantSku: sku, quantity: qty });
  }
  return lines;
}

export async function commitOrderInventory(
  payloadOrderDocId: string | number,
  payloadInstance?: Payload,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const doc = await payload.findByID({
    collection: 'orders',
    id: payloadOrderDocId,
    depth: 0,
  });

  if (!doc || doc.inventoryAdjusted === true) return;

  const lines = linesFromPayloadDoc(doc);
  await decrementOrderInventory(lines, payload);
  await payload.update({
    collection: 'orders',
    id: payloadOrderDocId,
    data: { inventoryAdjusted: true },
    context: ORDER_INVENTORY_CONTEXT,
  });
  revalidateCatalogCache();
}

/** Commit or release stock when admin changes Payload order payment/fulfillment status. */
export async function syncOrderInventoryForStatusChange(input: {
  payload?: Payload;
  docId: string | number;
  previousPaymentStatus?: string | null;
  previousOrderStatus?: string | null;
  nextPaymentStatus?: string | null;
  nextOrderStatus?: string | null;
  inventoryAdjusted?: boolean | null;
}): Promise<void> {
  const wasPaid = input.previousPaymentStatus === 'paid';
  const isPaid = input.nextPaymentStatus === 'paid';
  const wasCanceled = input.previousOrderStatus === 'canceled';
  const isCanceled = input.nextOrderStatus === 'canceled';
  const paymentFailed =
    input.nextPaymentStatus === 'failed' || input.nextPaymentStatus === 'refunded';

  if (isPaid && !wasPaid && input.inventoryAdjusted !== true) {
    await commitOrderInventory(input.docId, input.payload);
    return;
  }

  const shouldRelease =
    input.inventoryAdjusted === true &&
    !wasCanceled &&
    (isCanceled || (paymentFailed && !wasPaid));

  if (shouldRelease) {
    await releaseOrderInventory(input.docId, input.payload);
  }
}

export async function releaseOrderInventory(
  payloadOrderDocId: string | number,
  payloadInstance?: Payload,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const doc = await payload.findByID({
    collection: 'orders',
    id: payloadOrderDocId,
    depth: 0,
  });

  if (!doc || doc.inventoryAdjusted !== true) return;

  const lines = linesFromPayloadDoc(doc);
  await restockOrderInventory(lines, payload);
  await payload.update({
    collection: 'orders',
    id: payloadOrderDocId,
    data: { inventoryAdjusted: false },
    context: ORDER_INVENTORY_CONTEXT,
  });
  revalidateCatalogCache();
}
