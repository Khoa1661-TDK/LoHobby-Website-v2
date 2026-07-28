// lib/__tests__/auto-sale-ownership.test.ts
import { describe, it, expect } from 'vitest';
import { shouldReleaseAutoSale } from '@/lib/auto-sale/select';
import { AUTO_SALE_CONTEXT, isAutoSaleWrite } from '@/lib/payload-hooks';

describe('isAutoSaleWrite', () => {
  it('should recognise the job context', () => {
    expect(isAutoSaleWrite({ context: { ...AUTO_SALE_CONTEXT } })).toBe(true);
  });

  it('should be false for an ordinary admin request', () => {
    expect(isAutoSaleWrite({ context: {} })).toBe(false);
    expect(isAutoSaleWrite({})).toBe(false);
  });
});

describe('shouldReleaseAutoSale', () => {
  it('should release when an admin unticks the sale', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { onSale: false },
        original: { onSale: true, salePercent: 10 },
        isJobWrite: false,
      }),
    ).toBe(true);
  });

  it('should release when an admin changes the discount', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { salePercent: 25 },
        original: { onSale: true, salePercent: 10 },
        isJobWrite: false,
      }),
    ).toBe(true);
  });

  it('should not release when the job itself writes the sale', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { onSale: true, salePercent: 10 },
        original: { onSale: false, salePercent: null },
        isJobWrite: true,
      }),
    ).toBe(false);
  });

  it('should not release when an admin edits an unrelated field', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { title: 'New title' },
        original: { onSale: true, salePercent: 10 },
        isJobWrite: false,
      }),
    ).toBe(false);
  });

  it('should not release when the submitted sale values are unchanged', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { onSale: true, salePercent: 10 },
        original: { onSale: true, salePercent: 10 },
        isJobWrite: false,
      }),
    ).toBe(false);
  });

  it('should not release on create, where there is no original doc', () => {
    expect(
      shouldReleaseAutoSale({
        incoming: { onSale: true, salePercent: 20 },
        original: undefined,
        isJobWrite: false,
      }),
    ).toBe(false);
  });
});
