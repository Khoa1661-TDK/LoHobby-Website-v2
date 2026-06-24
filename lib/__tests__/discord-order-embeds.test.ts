import { describe, it, expect } from 'vitest';
import type { Order } from '@/src/payload/payload-types';
import { availableActions } from '@/lib/order-transitions';
import {
  buildOrdersListEmbed,
  buildOrderDetailEmbed,
  buildOrderActionComponents,
  buildSalesEmbed,
} from '@/lib/discord/order-embeds';

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: 42,
    orderId: '1007',
    totalAmount: 250000,
    currency: 'VND',
    paymentStatus: 'paid',
    orderStatus: 'processing',
    customerName: 'Nguyễn Văn A',
    phoneNumber: '0901234567',
    shippingAddress: '1 Đường ABC',
    deliveryMethod: 'SHIPMENT',
    paymentMethodKey: 'cod',
    lineItems: [{ productId: 'p1', productTitle: 'Áo thun', quantity: 2, unitPrice: 100000 }],
    createdAt: '2026-06-24T00:00:00.000Z',
    ...overrides,
  } as Order;
}

describe('buildOrdersListEmbed', () => {
  it('should include each order code and the status label in the title', () => {
    const embed = buildOrdersListEmbed([order({ id: 1, orderId: '1001' }), order({ id: 2, orderId: '1002' })], 'Tất cả');
    expect(embed.title).toContain('Tất cả');
    const flat = `${embed.description ?? ''}${JSON.stringify(embed.fields)}`;
    expect(flat).toContain('1001');
    expect(flat).toContain('1002');
  });

  it('should show an empty-state message when there are no orders', () => {
    const embed = buildOrdersListEmbed([], 'Chờ xử lý');
    const flat = `${embed.description ?? ''}${JSON.stringify(embed.fields)}`;
    expect(flat.toLowerCase()).toContain('không');
  });
});

describe('buildOrderDetailEmbed', () => {
  it('should show order code, total, customer and statuses', () => {
    const embed = buildOrderDetailEmbed(order());
    expect(embed.title).toContain('1007');
    const flat = JSON.stringify(embed);
    expect(flat).toContain('250.000₫');
    expect(flat).toContain('Nguyễn Văn A');
  });
});

describe('buildOrderActionComponents', () => {
  it('should render a link button (style 5) for ship and custom_id buttons for the rest', () => {
    const o = order();
    const actions = availableActions(o);
    const rows = buildOrderActionComponents(o);
    const buttons = rows.flatMap((r) => r.components);
    for (const action of actions) {
      if (action === 'ship') {
        const link = buttons.find((b) => b.style === 5 && (b.url ?? '').includes('/admin/collections/orders/42'));
        expect(link, 'ship should be a link button to admin').toBeTruthy();
      } else {
        const btn = buttons.find((b) => b.custom_id === `order_action:${action}:42`);
        expect(btn, `expected button for ${action}`).toBeTruthy();
      }
    }
  });

  it('should return no rows for an order with no available actions', () => {
    const rows = buildOrderActionComponents(order({ orderStatus: 'canceled' }));
    expect(rows.flatMap((r) => r.components)).toHaveLength(0);
  });
});

describe('buildSalesEmbed', () => {
  it('should show the count and VND total', () => {
    const embed = buildSalesEmbed('Hôm nay', 3, 750000);
    const flat = JSON.stringify(embed);
    expect(flat).toContain('3');
    expect(flat).toContain('750.000₫');
  });
});
