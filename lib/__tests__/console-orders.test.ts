// lib/__tests__/console-orders.test.ts
import { describe, it, expect } from 'vitest';
import type { Order } from '@/src/payload/payload-types';
import { toOrderRow, toOrderDetail } from '@/lib/console/orders';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 1,
    orderId: '2031',
    totalAmount: 450000,
    currency: 'VND',
    paymentStatus: 'paid',
    orderStatus: 'pending',
    customerName: 'Nguyễn Thị Hương',
    buyerEmail: 'huong.nguyen@email.com',
    phoneNumber: '0912 345 678',
    createdAt: '2026-08-20T02:14:00Z',
    updatedAt: '2026-08-20T02:14:00Z',
    ...overrides,
  } as Order;
}

describe('toOrderRow', () => {
  it('should map a fully populated order to its console row', () => {
    expect(toOrderRow(makeOrder())).toEqual({
      code: '#DH-2031',
      customer: 'Nguyễn Thị Hương',
      total: '450.000 ₫',
      payment: 'paid',
      order: 'pending',
      date: '20/08',
    });
  });

  it('should translate the Payload single-l canceled status to the console double-l spelling', () => {
    expect(toOrderRow(makeOrder({ orderStatus: 'canceled' })).order).toBe('cancelled');
  });

  it('should fall back to the related customer name when customerName is unset', () => {
    const doc = makeOrder({
      customerName: null,
      customer: { id: 7, email: 'lan@email.com', name: 'Vũ Thị Lan' } as never,
    });
    expect(toOrderRow(doc).customer).toBe('Vũ Thị Lan');
  });

  it('should fall back to the buyer email when the customer relationship is an unresolved id', () => {
    const doc = makeOrder({ customerName: null, customer: 7 as never });
    expect(toOrderRow(doc).customer).toBe('huong.nguyen@email.com');
  });

  it('should render the guest label when no customer identity is present at all', () => {
    const doc = makeOrder({ customerName: null, buyerEmail: null, customer: null });
    expect(toOrderRow(doc).customer).toBe('Khách vãng lai');
  });

  it('should render zero dong when the total is null', () => {
    expect(toOrderRow(makeOrder({ totalAmount: null as never })).total).toBe('0 ₫');
  });

  it('should fall back to the pending status when the order status is unrecognised', () => {
    expect(toOrderRow(makeOrder({ orderStatus: 'weird' as never })).order).toBe('pending');
  });

  it('should fall back to the pending payment status when the payment status is unrecognised', () => {
    expect(toOrderRow(makeOrder({ paymentStatus: 'weird' as never })).payment).toBe('pending');
  });
});

describe('toOrderDetail', () => {
  it('should map line items, totals and the customer block from a populated order', () => {
    const detail = toOrderDetail(
      makeOrder({
        subtotalAmount: 451000,
        shippingAmount: 25000,
        discountAmount: 45000,
        giftCardAmount: 20000,
        taxAmount: 39000,
        couponCode: 'LOHOBBY10',
        shippingAddress: '123 Đường Nguyễn Trãi, P.7, Q.5, TP.HCM',
        shippingCarrier: 'Giao hàng tiêu chuẩn (GHN)',
        paymentKind: 'Chuyển khoản ngân hàng · VietQR',
        inventoryAdjusted: true,
        lineItems: [
          {
            productId: '1',
            productTitle: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
            variantName: 'Màu: Đen',
            quantity: 2,
            unitPrice: 129000,
          },
        ],
      }),
    );

    expect(detail.code).toBe('#DH-2031');
    expect(detail.createdAt).toBe('20/08/2026, 09:14');
    expect(detail.grandTotal).toBe('450.000 ₫');
    expect(detail.items).toEqual([
      {
        name: 'Móc Khóa Game Minecraft Totem Hồi Sinh',
        meta: 'Màu: Đen · SL 2',
        price: '258.000 ₫',
      },
    ]);
    expect(detail.customer).toEqual({
      name: 'Nguyễn Thị Hương',
      email: 'huong.nguyen@email.com',
      phone: '0912 345 678',
    });
    expect(detail.shipping.address).toBe('123 Đường Nguyễn Trãi, P.7, Q.5, TP.HCM');
    expect(detail.stock).toBe('Đã trừ kho');
  });

  it('should omit the discount total line when there is no discount', () => {
    const detail = toOrderDetail(makeOrder({ discountAmount: 0, giftCardAmount: 0 }));
    const labels = detail.totals.map((t) => t.label);
    expect(labels).not.toContain('Mã giảm giá');
    expect(labels).not.toContain('Thẻ quà tặng');
  });

  it('should render the discount as a negative fail-tone amount with its coupon code', () => {
    const detail = toOrderDetail(makeOrder({ discountAmount: 45000, couponCode: 'LOHOBBY10' }));
    expect(detail.totals).toContainEqual({
      label: 'Mã giảm giá',
      amount: '−45.000 ₫',
      tone: 'fail',
      code: 'LOHOBBY10',
    });
  });

  it('should render an empty item list when lineItems is null', () => {
    expect(toOrderDetail(makeOrder({ lineItems: null })).items).toEqual([]);
  });

  it('should mark the paid timeline step done and leave later steps pending', () => {
    const detail = toOrderDetail(makeOrder({ paidAt: '2026-08-20T02:14:00Z' }));
    expect(detail.timeline[0]).toEqual({
      label: 'Đã thanh toán',
      done: true,
      time: '20/08 09:14',
    });
    expect(detail.timeline[1]).toEqual({ label: 'Đã xác nhận', done: false, time: '—' });
  });

  it('should say stock is not yet deducted when inventoryAdjusted is false', () => {
    expect(toOrderDetail(makeOrder({ inventoryAdjusted: false })).stock).toBe('Chưa trừ kho');
  });
});
