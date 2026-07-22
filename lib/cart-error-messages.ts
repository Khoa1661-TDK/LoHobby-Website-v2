// lib/cart-error-messages.ts
/**
 * Thrown cart error codes (see lib/cart.ts) mapped to the camelCase key under
 * `cart.errors` in messages/*.json. Keeping this in one place keeps the codes
 * and the message keys from drifting apart (finding 1.1).
 */
const CART_ERROR_KEYS: Record<string, string> = {
  INVALID_PRODUCT: 'invalidProduct',
  INVALID_QUANTITY: 'invalidQuantity',
  PRODUCT_NOT_FOUND: 'productNotFound',
  PRODUCT_UNAVAILABLE: 'productUnavailable',
  CART_FULL: 'cartFull',
  VARIANT_REQUIRED: 'variantRequired',
  INVALID_VARIANT: 'invalidVariant',
  INSUFFICIENT_STOCK: 'insufficientStock',
};

/** Returns the camelCase message key (no `errors.` prefix) for a known code, else null. */
export function cartErrorMessageKey(code: string): string | null {
  return CART_ERROR_KEYS[code] ?? null;
}
