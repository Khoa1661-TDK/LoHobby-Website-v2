// lib/__tests__/cart-error-messages.test.ts
import { describe, expect, it } from 'vitest';
import { cartErrorMessageKey } from '@/lib/cart-error-messages';

describe('cartErrorMessageKey', () => {
  it('should map every thrown cart code to a camelCase message key', () => {
    expect(cartErrorMessageKey('CART_FULL')).toBe('cartFull');
    expect(cartErrorMessageKey('VARIANT_REQUIRED')).toBe('variantRequired');
    expect(cartErrorMessageKey('PRODUCT_UNAVAILABLE')).toBe('productUnavailable');
    expect(cartErrorMessageKey('INSUFFICIENT_STOCK')).toBe('insufficientStock');
    expect(cartErrorMessageKey('INVALID_PRODUCT')).toBe('invalidProduct');
    expect(cartErrorMessageKey('INVALID_QUANTITY')).toBe('invalidQuantity');
    expect(cartErrorMessageKey('PRODUCT_NOT_FOUND')).toBe('productNotFound');
    expect(cartErrorMessageKey('INVALID_VARIANT')).toBe('invalidVariant');
  });

  it('should return null for an unknown code', () => {
    expect(cartErrorMessageKey('SOMETHING_ELSE')).toBeNull();
    expect(cartErrorMessageKey('')).toBeNull();
  });
});
