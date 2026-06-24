import { describe, it, expect } from 'vitest';
import { summarizeOrders } from '@/lib/payload-orders';

describe('summarizeOrders', () => {
  it('should sum totals and count non-canceled orders', () => {
    const result = summarizeOrders([
      { totalAmount: 100000, orderStatus: 'pending' },
      { totalAmount: 250000, orderStatus: 'delivered' },
      { totalAmount: 999000, orderStatus: 'canceled' },
    ]);
    expect(result.count).toBe(2);
    expect(result.total).toBe(350000);
  });

  it('should return zeros for an empty list', () => {
    expect(summarizeOrders([])).toEqual({ count: 0, total: 0 });
  });
});
