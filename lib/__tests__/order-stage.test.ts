// lib/__tests__/order-stage.test.ts
import { describe, expect, it } from 'vitest';
import { deriveOrderStage, stageToTab, type OrderStageInput } from '@/lib/order-stage';

function order(partial: Partial<OrderStageInput>): OrderStageInput {
  return {
    paymentStatus: 'pending',
    orderStatus: 'pending',
    paymentKind: null,
    confirmedAt: null,
    deliveryMethod: 'SHIPMENT',
    ...partial,
  };
}

describe('deriveOrderStage', () => {
  it('returns cancelled when order is canceled regardless of payment', () => {
    expect(deriveOrderStage(order({ orderStatus: 'canceled', paymentStatus: 'paid' }))).toBe('cancelled');
  });

  it('returns refunded when payment is refunded', () => {
    expect(deriveOrderStage(order({ paymentStatus: 'refunded', orderStatus: 'delivered' }))).toBe('refunded');
  });

  it('returns delivered when order is delivered', () => {
    expect(deriveOrderStage(order({ orderStatus: 'delivered', paymentStatus: 'paid' }))).toBe('delivered');
  });

  it('returns shipped when order is shipped', () => {
    expect(deriveOrderStage(order({ orderStatus: 'shipped', paymentStatus: 'paid' }))).toBe('shipped');
  });

  it('returns payment_failed for a failed online order not yet shipped', () => {
    expect(deriveOrderStage(order({ paymentStatus: 'failed', paymentKind: 'gateway' }))).toBe('payment_failed');
  });

  it('returns packing once confirmed but not yet shipped', () => {
    expect(deriveOrderStage(order({ paymentStatus: 'paid', confirmedAt: '2026-06-15T00:00:00Z' }))).toBe('packing');
  });

  it('returns to_confirm for a paid-but-unconfirmed order', () => {
    expect(deriveOrderStage(order({ paymentStatus: 'paid' }))).toBe('to_confirm');
  });

  it('returns to_confirm for an unconfirmed COD order', () => {
    expect(deriveOrderStage(order({ paymentKind: 'cod' }))).toBe('to_confirm');
  });

  it('returns to_confirm for an unconfirmed manual_transfer order', () => {
    expect(deriveOrderStage(order({ paymentKind: 'manual_transfer' }))).toBe('to_confirm');
  });

  it('returns awaiting_payment for an unpaid gateway order', () => {
    expect(deriveOrderStage(order({ paymentKind: 'gateway' }))).toBe('awaiting_payment');
  });
});

describe('stageToTab', () => {
  it('groups action-needing stages into needs_action', () => {
    expect(stageToTab('awaiting_payment')).toBe('needs_action');
    expect(stageToTab('to_confirm')).toBe('needs_action');
    expect(stageToTab('packing')).toBe('needs_action');
    expect(stageToTab('payment_failed')).toBe('needs_action');
  });

  it('groups shipped into in_transit and delivered into completed', () => {
    expect(stageToTab('shipped')).toBe('in_transit');
    expect(stageToTab('delivered')).toBe('completed');
  });

  it('groups terminal cancel/refund into cancelled_refunded', () => {
    expect(stageToTab('cancelled')).toBe('cancelled_refunded');
    expect(stageToTab('refunded')).toBe('cancelled_refunded');
  });
});
