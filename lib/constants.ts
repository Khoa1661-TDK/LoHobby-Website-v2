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
