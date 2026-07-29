// lib/constants.ts
export type SortFilterItem = {
  labelKey: string;
  slug: string | null;
  sortKey: 'RELEVANCE' | 'BEST_SELLING' | 'CREATED_AT' | 'PRICE';
  reverse: boolean;
};

export const defaultSort: SortFilterItem = {
  labelKey: 'relevance',
  slug: null,
  sortKey: 'RELEVANCE',
  reverse: false,
};

export const sorting: SortFilterItem[] = [
  defaultSort,
  { labelKey: 'bestSelling', slug: 'trending-desc', sortKey: 'BEST_SELLING', reverse: false },
  { labelKey: 'newest', slug: 'latest-desc', sortKey: 'CREATED_AT', reverse: true },
  { labelKey: 'priceAsc', slug: 'price-asc', sortKey: 'PRICE', reverse: false },
  { labelKey: 'priceDesc', slug: 'price-desc', sortKey: 'PRICE', reverse: true },
];

export const HIDDEN_PRODUCT_TAG = 'hidden';

/** Products per page on /search and category listing routes (server-safe constant). */
export const PAGE_SIZE = 24;

// --- Auto-sale (most-viewed products) -------------------------------------
// See docs/superpowers/specs/2026-07-26-auto-sale-most-viewed-design.md

/** Maximum products the auto-sale job keeps on sale at once. */
export const AUTO_SALE_COUNT = 5;

/** Discount applied to every auto-sale product, in percent. */
export const AUTO_SALE_PERCENT = 10;

/** Rolling window of view data used to rank products, in days. */
export const AUTO_SALE_WINDOW_DAYS = 7;

/**
 * Minimum unique viewers before a product is eligible. Without this floor, a
 * quiet week where three products drew one visitor each would discount all
 * three on the strength of a single page load.
 */
export const AUTO_SALE_MIN_VIEWERS = 5;

/**
 * Days a product stays ineligible after an admin removes a sale the job owned.
 * Without this, un-ticking a still-top-viewed product re-discounts it that night.
 */
export const AUTO_SALE_COOLDOWN_DAYS = 30;
