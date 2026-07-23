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
  OUT_OF_STOCK: 'outOfStock',
};

/** Returns the camelCase message key (no `errors.` prefix) for a known code, else null. */
export function cartErrorMessageKey(code: string): string | null {
  return CART_ERROR_KEYS[code] ?? null;
}

/** Structured cart error carrying an interpolation payload (stock messaging restore). */
export class CartStockError extends Error {
  readonly code: string;
  readonly params?: { name?: string; stock?: number };
  constructor(code: string, params?: { name?: string; stock?: number }) {
    super(code); // .message === code, so cartErrorMessageKey(error.message) still resolves
    this.name = 'CartStockError';
    this.code = code;
    this.params = params;
  }
}

/**
 * Resolve a thrown cart error to its message key + interpolation params.
 * Returns null for unknown codes so the caller falls back (never surface a raw message).
 */
export function cartErrorParams(
  error: unknown,
): { key: string; params?: { name?: string; stock?: number } } | null {
  if (!(error instanceof Error)) return null;
  const key = cartErrorMessageKey(error.message);
  if (!key) return null;
  const params = error instanceof CartStockError ? error.params : undefined;
  return { key, params };
}
