import { describe, expect, it } from 'vitest';
import { maxSelectableQuantity } from '@/lib/max-cart-quantity';

describe('maxSelectableQuantity', () => {
  it('should cap to the selected variant stock', () => {
    expect(maxSelectableQuantity({ hasVariants: true, variantSelected: true, stock: 3 })).toBe(3);
  });

  it('should force 1 when a variant product has no selection yet', () => {
    expect(maxSelectableQuantity({ hasVariants: true, variantSelected: false, stock: null })).toBe(1);
  });

  it('should use the fallback for a no-variant product with unknown stock', () => {
    expect(maxSelectableQuantity({ hasVariants: false, variantSelected: false, stock: null, fallback: 99 })).toBe(99);
  });

  it('should cap to stock for a no-variant product with known stock', () => {
    expect(maxSelectableQuantity({ hasVariants: false, variantSelected: false, stock: 5 })).toBe(5);
  });

  it('should never return less than 1', () => {
    expect(maxSelectableQuantity({ hasVariants: true, variantSelected: true, stock: 0 })).toBe(1);
  });
});
