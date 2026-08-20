// lib/__tests__/console-customers.test.ts
import { describe, it, expect } from 'vitest';
import type { StoreCustomer } from '@/src/payload/payload-types';
import { toCustomerRow } from '@/lib/console/customers';

function makeCustomer(overrides: Partial<StoreCustomer> = {}): StoreCustomer {
  return {
    id: 4,
    email: 'huong.nguyen@email.com',
    name: 'Nguyễn Thị Hương',
    updatedAt: '',
    createdAt: '',
    ...overrides,
  } as StoreCustomer;
}

describe('toCustomerRow', () => {
  it('should map a customer with orders to a fully populated row', () => {
    expect(toCustomerRow(makeCustomer(), { orderCount: 6, totalSpentVnd: 1240000 })).toEqual({
      id: '4',
      name: 'Nguyễn Thị Hương',
      contact: 'huong.nguyen@email.com',
      orderCount: 6,
      totalSpent: '1.240.000 ₫',
    });
  });

  it('should report zero orders and zero spend when the customer has no totals', () => {
    const row = toCustomerRow(makeCustomer(), undefined);
    expect(row.orderCount).toBe(0);
    expect(row.totalSpent).toBe('0 ₫');
  });

  it('should fall back to the email as the display name when name is unset', () => {
    const row = toCustomerRow(makeCustomer({ name: null }), undefined);
    expect(row.name).toBe('huong.nguyen@email.com');
  });

  it('should fall back to the phone number as contact when there is no email', () => {
    const row = toCustomerRow(
      makeCustomer({ email: '' as never, phone: '0912 345 678' }),
      undefined,
    );
    expect(row.contact).toBe('0912 345 678');
  });

  it('should render the guest label when the customer has neither name nor email', () => {
    const row = toCustomerRow(makeCustomer({ name: null, email: '' as never }), undefined);
    expect(row.name).toBe('Khách vãng lai');
  });
});
