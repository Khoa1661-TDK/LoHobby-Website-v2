// lib/__tests__/order-transitions.test.ts
import { describe, expect, it } from 'vitest';
import { availableActions, type TransitionInput } from '@/lib/order-transitions';

function order(partial: Partial<TransitionInput>): TransitionInput {
  return {
    paymentStatus: 'pending',
    orderStatus: 'pending',
    paymentKind: null,
    confirmedAt: null,
    deliveryMethod: 'SHIPMENT',
    trackingNumber: null,
    shipmentStatus: null,
    ...partial,
  };
}

describe('availableActions', () => {
  it('awaiting_payment offers mark_paid then cancel', () => {
    expect(availableActions(order({ paymentKind: 'gateway' }))).toEqual(['mark_paid', 'cancel']);
  });

  it('to_confirm (COD, unpaid) offers confirm, mark_paid, cancel', () => {
    expect(availableActions(order({ paymentKind: 'cod' }))).toEqual(['confirm', 'mark_paid', 'cancel']);
  });

  it('to_confirm (already paid) hides mark_paid', () => {
    expect(availableActions(order({ paymentStatus: 'paid' }))).toEqual(['confirm', 'cancel']);
  });

  it('packing (shipment) offers ship then cancel', () => {
    expect(availableActions(order({ paymentStatus: 'paid', confirmedAt: 'x' }))).toEqual(['ship', 'cancel']);
  });

  it('packing (pickup) offers mark_delivered instead of ship', () => {
    expect(
      availableActions(order({ paymentStatus: 'paid', confirmedAt: 'x', deliveryMethod: 'PICKUP' })),
    ).toEqual(['mark_delivered', 'cancel']);
  });

  it('shipped (prepaid) offers sync, mark_delivered, refund, cancel', () => {
    expect(
      availableActions(order({ paymentStatus: 'paid', orderStatus: 'shipped', trackingNumber: 'T1' })),
    ).toEqual(['sync_tracking', 'mark_delivered', 'refund', 'cancel']);
  });

  it('shipped (COD, unpaid) omits refund', () => {
    expect(
      availableActions(order({ paymentKind: 'cod', orderStatus: 'shipped', trackingNumber: 'T1' })),
    ).toEqual(['sync_tracking', 'mark_delivered', 'cancel']);
  });

  it('delivered (paid) offers only refund', () => {
    expect(availableActions(order({ paymentStatus: 'paid', orderStatus: 'delivered' }))).toEqual(['refund']);
  });

  it('delivered (COD, unpaid) offers nothing', () => {
    expect(availableActions(order({ paymentKind: 'cod', orderStatus: 'delivered' }))).toEqual([]);
  });

  it('payment_failed offers mark_paid and cancel', () => {
    expect(availableActions(order({ paymentStatus: 'failed', paymentKind: 'gateway' }))).toEqual(['mark_paid', 'cancel']);
  });

  it('terminal stages offer nothing', () => {
    expect(availableActions(order({ orderStatus: 'canceled' }))).toEqual([]);
    expect(availableActions(order({ paymentStatus: 'refunded' }))).toEqual([]);
  });
});
