import { describe, expect, it } from 'vitest';
import { orderStatusLabelKey } from '@/lib/order-status-labels';

describe('orderStatusLabelKey', () => {
  it('should map each order status to a label key', () => {
    expect(orderStatusLabelKey('PENDING')).toBe('pending');
    expect(orderStatusLabelKey('PENDING_COD')).toBe('pendingCod');
    expect(orderStatusLabelKey('PENDING_ONLINE')).toBe('pendingOnline');
    expect(orderStatusLabelKey('PENDING_TRANSFER')).toBe('pendingTransfer');
    expect(orderStatusLabelKey('PAID')).toBe('paid');
    expect(orderStatusLabelKey('SHIPPED')).toBe('shipped');
    expect(orderStatusLabelKey('DELIVERED')).toBe('delivered');
    expect(orderStatusLabelKey('CANCELLED')).toBe('cancelled');
  });

  it('should fall back to pending for an unknown status', () => {
    expect(orderStatusLabelKey('WHATEVER')).toBe('pending');
  });
});
