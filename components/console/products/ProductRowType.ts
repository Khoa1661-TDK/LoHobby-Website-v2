// components/console/products/ProductRowType.ts
//
// Row shape for the products list. Exported so the data layer can implement
// it later; the list screen renders the sample rows from the artboard.

export type ProductStatus = 'listed' | 'draft';

export interface ProductRow {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  /** Discount label when a promotion applies, e.g. 'Tự động -15%'. */
  promo: string | null;
  /** Set when the product is managed by the automatic discount system. */
  autoDiscountNote: string | null;
  status: ProductStatus;
  /** Presentational: checked in the artboard. */
  selected: boolean;
}
