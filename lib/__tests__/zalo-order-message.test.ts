import { describe, it, expect } from 'vitest';
import type { Order } from '@/src/payload/payload-types';
import { buildOrderMessage } from '@/lib/zalo/order-notification';

function sampleOrder(): Order {
  return {
    id: 42,
    orderId: '1007',
    totalAmount: 250000,
    currency: 'VND',
    paymentStatus: 'pending',
    orderStatus: 'pending',
    customerName: 'Nguyễn Văn A',
    phoneNumber: '0901234567',
    paymentMethodKey: 'cod',
    lineItems: [
      { productId: 'p1', productTitle: 'Áo thun', quantity: 2, unitPrice: 100000 },
      { productId: 'p2', productTitle: 'Nón', quantity: 1, unitPrice: 50000 },
    ],
  } as Order;
}

describe('buildOrderMessage', () => {
  it('should include order code and VND-formatted total when building the message', () => {
    const msg = buildOrderMessage(sampleOrder());
    expect(msg).toContain('#1007');
    expect(msg).toContain('250.000₫');
  });

  it('should include customer name and phone when present', () => {
    const msg = buildOrderMessage(sampleOrder());
    expect(msg).toContain('Nguyễn Văn A');
    expect(msg).toContain('0901234567');
  });

  it('should list every line item with quantity', () => {
    const msg = buildOrderMessage(sampleOrder());
    expect(msg).toContain('Áo thun x2');
    expect(msg).toContain('Nón x1');
  });

  it('should include payment method and an admin order link', () => {
    const msg = buildOrderMessage(sampleOrder());
    expect(msg).toContain('cod');
    expect(msg).toContain('/admin/collections/orders/42');
  });
});
