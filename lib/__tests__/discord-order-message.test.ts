import { describe, it, expect } from 'vitest';
import type { Order } from '@/src/payload/payload-types';
import { buildOrderEmbed, buildConfirmComponents } from '@/lib/discord/order-notification';

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

describe('buildOrderEmbed', () => {
  it('should put the order code in the title and VND-formatted total in a field', () => {
    const embed = buildOrderEmbed(sampleOrder());
    expect(embed.title).toContain('#1007');
    const total = embed.fields?.find((f) => f.name === 'Tổng tiền');
    expect(total?.value).toBe('250.000₫');
  });

  it('should include customer name and phone fields when present', () => {
    const embed = buildOrderEmbed(sampleOrder());
    const flat = JSON.stringify(embed.fields);
    expect(flat).toContain('Nguyễn Văn A');
    expect(flat).toContain('0901234567');
  });

  it('should list every line item with quantity', () => {
    const embed = buildOrderEmbed(sampleOrder());
    const items = embed.fields?.find((f) => f.name === 'Sản phẩm');
    expect(items?.value).toContain('Áo thun x2');
    expect(items?.value).toContain('Nón x1');
  });

  it('should link the embed to the admin order page', () => {
    const embed = buildOrderEmbed(sampleOrder());
    expect(embed.url).toContain('/admin/collections/orders/42');
  });
});

describe('buildConfirmComponents', () => {
  it('should encode the order doc id in the button custom_id', () => {
    const components = buildConfirmComponents(sampleOrder());
    const button = components[0].components[0];
    expect(button.custom_id).toBe('confirm_order:42');
    expect(button.label).toContain('Xác nhận');
  });
});
