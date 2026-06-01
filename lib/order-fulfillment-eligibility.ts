// lib/order-fulfillment-eligibility.ts — when confirm / ship actions are allowed

export function isOrderConfirmable(input: {
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
  confirmedAt?: string | null;
}): boolean {
  if (input.orderStatus === 'canceled') return false;
  if (input.confirmedAt) return false;
  if (input.paymentStatus === 'paid') return true;

  const kind = typeof input.paymentKind === 'string' ? input.paymentKind : '';
  // COD and bank transfer orders are confirmable before online payment clears
  if (kind === 'cod' || kind === 'manual_transfer') return true;

  return false;
}

export function isOrderNeedingFulfillment(input: {
  paymentStatus?: string | null;
  orderStatus?: string | null;
  paymentKind?: string | null;
  confirmedAt?: string | null;
  trackingNumber?: string | null;
  deliveryMethod?: string | null;
}): boolean {
  if (input.orderStatus === 'delivered' || input.orderStatus === 'canceled') return false;
  if (!isOrderConfirmable(input) && !input.confirmedAt) return false;

  if (!input.confirmedAt) return true;
  if (input.deliveryMethod === 'SHIPMENT' && !input.trackingNumber) return true;

  return false;
}
