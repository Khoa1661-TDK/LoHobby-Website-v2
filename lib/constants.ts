// lib/constants.ts
export type SortFilterItem = {
  title: string;
  slug: string | null;
  sortKey: 'RELEVANCE' | 'BEST_SELLING' | 'CREATED_AT' | 'PRICE';
  reverse: boolean;
};

export const defaultSort: SortFilterItem = {
  title: 'Liên quan',
  slug: null,
  sortKey: 'RELEVANCE',
  reverse: false,
};

export const sorting: SortFilterItem[] = [
  defaultSort,
  { title: 'Bán chạy', slug: 'trending-desc', sortKey: 'BEST_SELLING', reverse: false },
  { title: 'Hàng mới về', slug: 'latest-desc', sortKey: 'CREATED_AT', reverse: true },
  { title: 'Giá: Thấp đến cao', slug: 'price-asc', sortKey: 'PRICE', reverse: false },
  { title: 'Giá: Cao đến thấp', slug: 'price-desc', sortKey: 'PRICE', reverse: true },
];

export const HIDDEN_PRODUCT_TAG = 'hidden';
