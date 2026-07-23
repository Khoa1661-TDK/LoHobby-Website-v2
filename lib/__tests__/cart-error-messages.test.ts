// lib/__tests__/cart-error-messages.test.ts
import { describe, expect, it } from 'vitest';
import { cartErrorMessageKey, cartErrorParams, CartStockError } from '@/lib/cart-error-messages';

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

  it('should map OUT_OF_STOCK to outOfStock', () => {
    expect(cartErrorMessageKey('OUT_OF_STOCK')).toBe('outOfStock');
  });

  it('should map INSUFFICIENT_STOCK to insufficientStock', () => {
    expect(cartErrorMessageKey('INSUFFICIENT_STOCK')).toBe('insufficientStock');
  });

  it('should return null for a raw sentence (not a code)', () => {
    expect(cartErrorMessageKey('"X" chỉ còn 3 sản phẩm.')).toBeNull();
  });
});

describe('cartErrorParams', () => {
  it('should resolve a CartStockError to its key and params (regression: stock messages no longer collapse)', () => {
    const err = new CartStockError('INSUFFICIENT_STOCK', { name: 'Widget', stock: 3 });
    expect(cartErrorParams(err)).toEqual({ key: 'insufficientStock', params: { name: 'Widget', stock: 3 } });
  });
  it('should resolve a plain coded Error with no params', () => {
    expect(cartErrorParams(new Error('CART_FULL'))).toEqual({ key: 'cartFull', params: undefined });
  });
  it('should return null for an unknown thrown message so the caller uses the fallback', () => {
    expect(cartErrorParams(new Error('some raw vietnamese sentence'))).toBeNull();
  });
  it('should return null for a non-Error', () => {
    expect(cartErrorParams('nope')).toBeNull();
  });
});
