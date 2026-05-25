// lib/shopify/index.ts — Vercel Commerce data-layer shim backed by Prisma + payOS
import {
  getProduct as fetchProduct,
  getProductById,
  getProducts as fetchProducts,
  getProductsByTag,
  type UIProduct,
} from '@/src/lib/db-adapter';
import {
  addToCart as addLine,
  getCart as getLocalCart,
  removeLine,
  updateLine,
  type Cart as LocalCart,
} from '@/lib/cart';
import { HIDDEN_PRODUCT_TAG } from '@/lib/constants';
import { prisma } from '@/lib/prisma';
import type { Cart, CartItem, Collection, Menu, Product, SortKey } from './types';

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

function toProduct(p: UIProduct): Product {
  return {
    id: p.id,
    handle: p.handle,
    availableForSale: p.availableForSale,
    title: p.title,
    description: p.description,
    descriptionHtml: p.descriptionHtml,
    options: p.options,
    priceRange: p.priceRange,
    variants: p.variants,
    featuredImage: p.featuredImage,
    images: p.images,
    seo: p.seo,
    tags: p.tags,
    updatedAt: p.updatedAt,
  };
}

function toCommerceCart(local: LocalCart): Cart {
  const currency = local.cost.subtotalAmount.currencyCode;
  const lines: CartItem[] = local.lines.map((line) => ({
    id: line.id,
    handle: line.handle,
    merchandiseId: line.merchandiseId,
    quantity: line.quantity,
    cost: { totalAmount: line.lineTotal },
    lineTotal: line.lineTotal,
    product: line.product,
    merchandise: {
      id: line.merchandiseId,
      title: line.product.title,
      selectedOptions: [],
      product: {
        id: line.product.id,
        handle: line.product.handle,
        title: line.product.title,
        featuredImage: line.product.featuredImage,
      },
    },
  }));

  return {
    id: local.id,
    checkoutUrl: '/checkout',
    cost: {
      subtotalAmount: local.cost.subtotalAmount,
      totalAmount: local.cost.totalAmount,
      totalTaxAmount: { amount: '0', currencyCode: currency },
    },
    lines,
    totalQuantity: local.totalQuantity,
  };
}

function resolveSort(sortKey: SortKey | undefined): {
  field: 'createdAt' | 'priceVnd' | 'title';
} {
  if (sortKey === 'PRICE') return { field: 'priceVnd' };
  if (sortKey === 'BEST_SELLING' || sortKey === 'CREATED_AT') return { field: 'createdAt' };
  return { field: 'createdAt' };
}

// ---------- Products ----------

export async function getProducts(opts?: {
  query?: string;
  reverse?: boolean;
  sortKey?: SortKey;
}): Promise<Product[]> {
  const { field } = resolveSort(opts?.sortKey);
  const rows = await fetchProducts({
    query: opts?.query,
    reverse: opts?.reverse,
    sortKey: field,
    limit: 100,
  });
  return rows.filter((p) => !p.tags.includes(HIDDEN_PRODUCT_TAG)).map(toProduct);
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  const row = await fetchProduct(handle);
  if (!row || row.tags.includes(HIDDEN_PRODUCT_TAG)) return undefined;
  return toProduct(row);
}

export async function getProductRecommendations(productId: string): Promise<Product[]> {
  const base = await getProductById(productId);
  if (!base) return [];
  const tag = base.tags.find((t) => t !== 'all');
  if (!tag) {
    const all = await fetchProducts({ limit: 4 });
    return all.filter((p) => p.id !== productId).slice(0, 3).map(toProduct);
  }
  const related = await getProductsByTag(tag);
  return related.filter((p) => p.id !== productId).slice(0, 3).map(toProduct);
}

// ---------- Collections (tags) ----------

export async function getCollections(): Promise<Collection[]> {
  const rows = await prisma.product.findMany({ select: { tags: true } });
  const unique = new Set<string>();
  for (const row of rows) {
    for (const tag of row.tags) {
      if (tag !== 'all' && !tag.startsWith('hidden')) unique.add(tag);
    }
  }

  const all: Collection = {
    handle: '',
    title: 'All',
    description: 'All products',
    seo: { title: 'All', description: 'All products' },
    path: '/search',
    updatedAt: new Date().toISOString(),
  };

  const collections: Collection[] = [all];
  for (const handle of unique) {
    collections.push({
      handle,
      title: handle.charAt(0).toUpperCase() + handle.slice(1),
      description: `Products tagged ${handle}`,
      seo: { title: handle, description: `Products tagged ${handle}` },
      path: `/search/${handle}`,
      updatedAt: new Date().toISOString(),
    });
  }
  return collections;
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
  const rows = await getProductsByTag(collection);
  const products = rows.map(toProduct);
  const { field } = resolveSort(sortKey);
  products.sort((a, b) => {
    if (field === 'priceVnd') {
      return Number(a.priceRange.minVariantPrice.amount) -
        Number(b.priceRange.minVariantPrice.amount);
    }
    if (field === 'title') return a.title.localeCompare(b.title);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  if (reverse) products.reverse();
  return products;
}

export async function getMenu(_handle: string): Promise<Menu[]> {
  return [
    { title: 'All', path: '/search' },
    { title: 'Shop', path: '/' },
  ];
}

// ---------- Cart ----------

export async function createCart(): Promise<Cart> {
  return toCommerceCart(await getLocalCart());
}

export async function getCart(): Promise<Cart | undefined> {
  const local = await getLocalCart();
  if (local.lines.length === 0 && local.totalQuantity === 0) return undefined;
  return toCommerceCart(local);
}

export async function addToCart(
  lines: { merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  let local = await getLocalCart();
  for (const line of lines) {
    local = await addLine(line.merchandiseId, line.quantity);
  }
  return toCommerceCart(local);
}

export async function removeFromCart(lineIds: string[]): Promise<Cart> {
  let local = await getLocalCart();
  for (const lineId of lineIds) {
    const merchandiseId = lineId.split(':').pop();
    if (merchandiseId) local = await removeLine(merchandiseId);
  }
  return toCommerceCart(local);
}

export async function updateCart(
  lines: { id: string; merchandiseId: string; quantity: number }[],
): Promise<Cart> {
  let local = await getLocalCart();
  for (const line of lines) {
    local = await updateLine(line.merchandiseId, line.quantity);
  }
  return toCommerceCart(local);
}
