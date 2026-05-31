// lib/payload-order-hooks.ts — inventory sync when admins edit Payload orders in ShopNex CMS
import type { CollectionAfterChangeHook } from 'payload';
import { isOrderInventorySync } from '@/lib/payload-hooks';
import { syncOrderInventoryForStatusChange } from '@/lib/order-inventory';

export const syncOrderInventoryOnStatusChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (isOrderInventorySync(req)) return doc;

  const prev = previousDoc as {
    paymentStatus?: string | null;
    orderStatus?: string | null;
    inventoryAdjusted?: boolean | null;
  } | null;

  const paymentChanged = prev?.paymentStatus !== doc.paymentStatus;
  const orderChanged = prev?.orderStatus !== doc.orderStatus;
  if (!paymentChanged && !orderChanged) return doc;

  await syncOrderInventoryForStatusChange({
    docId: doc.id,
    previousPaymentStatus: prev?.paymentStatus,
    previousOrderStatus: prev?.orderStatus,
    nextPaymentStatus: doc.paymentStatus,
    nextOrderStatus: doc.orderStatus,
    inventoryAdjusted: doc.inventoryAdjusted,
  }).catch((err: unknown) => {
    console.warn('[orders.afterChange] inventory sync failed', err);
  });

  return doc;
};
