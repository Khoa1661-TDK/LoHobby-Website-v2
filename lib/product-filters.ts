// lib/product-filters.ts — in-memory facet filtering for listing pages
import type { Product } from '@/lib/shopify/types';

export type ProductFilters = {
  priceMin: number | null;
  priceMax: number | null;
  inStock: boolean;
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function toNumber(value: string | string[] | undefined): number | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

export function parseProductFilters(searchParams: RawSearchParams): ProductFilters {
  return {
    priceMin: toNumber(searchParams.price_min),
    priceMax: toNumber(searchParams.price_max),
    inStock: searchParams.in_stock === '1' || searchParams.in_stock === 'true',
  };
}

export function hasActiveFilters(filters: ProductFilters): boolean {
  return filters.priceMin !== null || filters.priceMax !== null || filters.inStock;
}

export function applyProductFilters(products: Product[], filters: ProductFilters): Product[] {
  return products.filter((product) => {
    if (filters.inStock && !product.availableForSale) return false;
    const price = Number(product.priceRange.minVariantPrice.amount);
    if (filters.priceMin !== null && price < filters.priceMin) return false;
    if (filters.priceMax !== null && price > filters.priceMax) return false;
    return true;
  });
}
