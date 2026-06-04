// lib/payload-order-hooks.ts — inventory sync + payment normalization for Payload orders
import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload';
import type { Order } from '@/src/payload/payload-types';
import { isOrderInventorySync, isSkipOrderInventoryHook } from '@/lib/payload-hooks';
import { syncOrderInventoryForStatusChange } from '@/lib/order-inventory';
import { notifyNewOrder } from '@/lib/zalo/order-notification';

/** Auto-set paidAt / processing when admin marks an order paid in CMS. */
export const normalizeOrderPaymentOnChange: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  if (data.paymentStatus === 'paid' && originalDoc?.paymentStatus !== 'paid') {
    if (!data.paidAt) {
      data.paidAt = new Date().toISOString();
    }
    if (!data.orderStatus || data.orderStatus === 'pending') {
      data.orderStatus = 'processing';
    }
  }
  return data;
};

export const syncOrderInventoryOnStatusChange: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  context,
}) => {
  if (
    isOrderInventorySync(req) ||
    isSkipOrderInventoryHook(req) ||
    context?.skipOrderInventoryHook === true
  ) {
    return doc;
  }

  const prev = previousDoc as {
    paymentStatus?: string | null;
    orderStatus?: string | null;
    inventoryAdjusted?: boolean | null;
  } | null;

  const paymentChanged = prev?.paymentStatus !== doc.paymentStatus;
  const orderChanged = prev?.orderStatus !== doc.orderStatus;
  if (!paymentChanged && !orderChanged) return doc;

  // Run inventory in the background — do not block CMS saves or mark-paid API.
  void syncOrderInventoryForStatusChange({
    payload: req.payload,
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

/** Notify the seller on Zalo when a brand-new order is created. Fire-and-forget. */
export const notifySellerOnNewOrder: CollectionAfterChangeHook = ({ doc, operation, req }) => {
  if (operation !== 'create') return doc;

  void notifyNewOrder({ payload: req.payload, order: doc as Order }).catch((err: unknown) => {
    console.warn('[orders.afterChange] zalo notify failed', { orderId: doc?.id, err });
  });

  return doc;
};
