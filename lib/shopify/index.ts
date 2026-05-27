// lib/shopify/index.ts — Storefront catalog facade over Payload CMS
import {
  getPayloadCollections,
  getPayloadProducts,
  getPayloadProductsByCategorySlug,
  getPayloadStoreCategories,
} from '@/lib/payload-products';
import type { Collection, Product, SortKey } from './types';

export type {
  Cart,
  CartItem,
  Collection,
  Image,
  Menu,
  Money,
  Product,
  ProductVariant,
} from './types';

export async function getProducts(opts?: {
  query?: string;
  reverse?: boolean;
  sortKey?: SortKey;
}): Promise<Product[]> {
  return getPayloadProducts(opts);
}

export async function getCollections(): Promise<Collection[]> {
  return getPayloadCollections();
}

export async function getStoreCategories() {
  return getPayloadStoreCategories();
}

export async function getCollection(handle: string): Promise<Collection | undefined> {
  const collections = await getCollections();
  return collections.find((c) => c.handle === handle);
}

export async function getCollectionProducts({
  collection,
  reverse,
  sortKey,
}: {
  collection: string;
  reverse?: boolean;
  sortKey?: SortKey;
}): Promise<Product[]> {
  if (!collection || collection === 'all') {
    return getProducts({ reverse, sortKey });
  }
  return getPayloadProductsByCategorySlug(collection, { reverse, sortKey });
}
