// lib/__tests__/order-fulfillment-view-lineitems.test.ts
import { describe, expect, it } from 'vitest';
import { mapOrderToFulfillmentView } from '@/lib/order-fulfillment-view';
import type { Order } from '@/src/payload/payload-types';

describe('mapOrderToFulfillmentView lineItems', () => {
  it('maps line items with title, quantity, and unit price', () => {
    const doc = {
      id: 1,
      orderId: '1042',
      lineItems: [
        { productId: 'p1', productTitle: 'Áo thun', quantity: 2, unitPrice: 150000, variantName: 'M' },
      ],
    } as unknown as Order;

    const view = mapOrderToFulfillmentView(doc);
    expect(view.lineItems).toEqual([
      { productTitle: 'Áo thun', variantName: 'M', quantity: 2, unitPrice: 150000 },
    ]);
  });

  it('defaults to an empty array when there are no line items', () => {
    const view = mapOrderToFulfillmentView({ id: 1, orderId: '1' } as unknown as Order);
    expect(view.lineItems).toEqual([]);
  });
});
