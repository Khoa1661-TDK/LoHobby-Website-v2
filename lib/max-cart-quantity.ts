const DEFAULT_FALLBACK = 99;

/**
 * The maximum quantity the stepper should allow. Returns real stock when known,
 * forces 1 while a variant product still needs a selection, and only falls back
 * to a generous default when stock is genuinely unknown (finding 2.6).
 */
export function maxSelectableQuantity(input: {
  hasVariants: boolean;
  variantSelected: boolean;
  stock: number | null;
  fallback?: number;
}): number {
  const { hasVariants, variantSelected, stock, fallback = DEFAULT_FALLBACK } = input;
  if (hasVariants && !variantSelected) return 1;
  if (typeof stock === 'number' && Number.isFinite(stock)) {
    return Math.max(1, Math.floor(stock));
  }
  return Math.max(1, fallback);
}
