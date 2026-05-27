// lib/payload-products.ts — Payload CMS as the single catalog source for the storefront
import config from '@payload-config';
import { unstable_cache } from 'next/cache';
import { getPayload, type Where } from 'payload';
import { toStoreCategory, type StoreCategory } from '@/lib/categories';
import { getDefaultCategoryOrder } from '@/lib/default-categories';
import { HIDDEN_PRODUCT_TAG } from '@/lib/constants';
import {
  normalizeProductImageUrl,
  type StoredImage,
} from '@/lib/product-image-snapshot';
import type { Collection, Image, Product, SortKey } from '@/lib/shopify/types';

const PLACEHOLDER = '/images/placeholder.svg';
const CATALOG_REVALIDATE = 60;

type MediaDoc = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

export type CategoryDoc = {
  id: string | number;
  title: string;
  slug: string;
  subtitle?: string | null;
  meta?: SeoMeta | null;
  updatedAt?: string;
};

type SeoMeta = {
  title?: string | null;
  description?: string | null;
  image?: MediaDoc | string | null;
  keywords?: string | null;
};

export type PayloadProductDoc = {
  id: string | number;
  title: string;
  slug: string;
  price: number;
  description?: string | null;
  available?: boolean | null;
  tags?: string[] | null;
  category?: Array<CategoryDoc | string | number> | null;
  image?: MediaDoc | string | null;
  storedImage?: StoredImage | null;
  gallery?: Array<{ media?: MediaDoc | string | null } | null> | null;
  storedGallery?: StoredImage[] | null;
  meta?: SeoMeta | null;
  createdAt: string;
  updatedAt: string;
};

function resolveMedia(value: MediaDoc | string | null | undefined): MediaDoc | null {
  if (!value || typeof value === 'string') return null;
  return value;
}

export function resolveCategories(value: PayloadProductDoc['category']): CategoryDoc[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is CategoryDoc =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.title === 'string' &&
      typeof item.slug === 'string',
  );
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (char) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char),
  );

function toImage(url: string, alt: string, width?: number | null, height?: number | null): Image {
  return {
    url: normalizeProductImageUrl(url),
    altText: alt,
    width: width ?? 1200,
    height: height ?? 1200,
  };
}

function collectImages(doc: PayloadProductDoc): Image[] {
  const images: Image[] = [];
  const seen = new Set<string>();

  const pushStored = (
    stored: StoredImage | null | undefined,
    fallbackAlt: string,
  ) => {
    if (!stored?.url || seen.has(stored.url)) return;
    seen.add(stored.url);
    images.push(toImage(stored.url, stored.alt ?? fallbackAlt, stored.width, stored.height));
  };

  const pushMedia = (media: MediaDoc | null, fallbackAlt: string) => {
    if (!media?.url || seen.has(media.url)) return;
    seen.add(media.url);
    images.push(toImage(media.url, media.alt ?? fallbackAlt, media.width, media.height));
  };

  pushStored(doc.storedImage, doc.title);

  if (Array.isArray(doc.storedGallery)) {
    for (const item of doc.storedGallery) {
      pushStored(item, doc.title);
    }
  }

  if (images.length === 0) {
    pushMedia(resolveMedia(doc.image), doc.title);

    if (Array.isArray(doc.gallery)) {
      for (const item of doc.gallery) {
        pushMedia(resolveMedia(item?.media), doc.title);
      }
    }
  }

  if (images.length === 0) {
    images.push(toImage(PLACEHOLDER, doc.title));
  }

  return images;
}

export function mapPayloadProductToCommerceProduct(doc: PayloadProductDoc): Product {
  const slug = doc.slug?.trim() || String(doc.id);
  const title = doc.title.trim();
  const description = typeof doc.description === 'string' ? doc.description : '';
  const priceAmount = Math.max(0, Math.round(doc.price)).toString();
  const price = { amount: priceAmount, currencyCode: 'VND' };
  const images = collectImages(doc);
  const categories = resolveCategories(doc.category);
  const tags = Array.isArray(doc.tags) ? doc.tags.filter(Boolean) : [];
  const meta = doc.meta ?? {};
  const availableForSale = doc.available !== false && !tags.includes(HIDDEN_PRODUCT_TAG);
  const id = String(doc.id);

  return {
    id,
    handle: slug,
    availableForSale,
    title,
    description,
    descriptionHtml: description ? `<p>${escapeHtml(description)}</p>` : '',
    options: [],
    priceRange: { maxVariantPrice: price, minVariantPrice: price },
    variants: [
      {
        id,
        title: 'Default',
        availableForSale,
        selectedOptions: [],
        price,
      },
    ],
    featuredImage: images[0]!,
    images,
    seo: {
      title: meta.title?.trim() || title,
      description: meta.description?.trim() || description,
    },
    tags,
    categorySlugs: categories.map((category) => category.slug).filter(Boolean),
    updatedAt: doc.updatedAt,
  };
}

function pickDocs<T>(result: unknown): T[] {
  if (!result || typeof result !== 'object') return [];
  const docs = (result as { docs?: unknown }).docs;
  return Array.isArray(docs) ? (docs as T[]) : [];
}

function pickFirstDoc<T>(result: unknown): T | null {
  const docs = pickDocs<T>(result);
  return docs[0] ?? null;
}

async function getPayloadClient() {
  return getPayload({ config });
}

function isVisibleProduct(product: Product): boolean {
  return !product.tags.includes(HIDDEN_PRODUCT_TAG);
}

function sortProducts(products: Product[], sortKey?: SortKey, reverse?: boolean): Product[] {
  const sorted = [...products];
  sorted.sort((a, b) => {
    if (sortKey === 'PRICE') {
      return (
        Number(a.priceRange.minVariantPrice.amount) - Number(b.priceRange.minVariantPrice.amount)
      );
    }
    if (sortKey === 'RELEVANCE') {
      return a.title.localeCompare(b.title, 'vi');
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  if (reverse) sorted.reverse();
  return sorted;
}

export async function getPayloadProductBySlug(slug: string): Promise<Product | undefined> {
  const trimmed = slug?.trim();
  if (!trimmed) return undefined;

  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: trimmed } },
    depth: 2,
    limit: 1,
    pagination: false,
  });

  const doc = pickFirstDoc<PayloadProductDoc>(result);
  if (!doc) return undefined;

  const product = mapPayloadProductToCommerceProduct(doc);
  if (!isVisibleProduct(product)) return undefined;
  return product;
}

export async function getPayloadProductById(id: string): Promise<Product | undefined> {
  const trimmed = id?.trim();
  if (!trimmed) return undefined;

  try {
    const payload = await getPayloadClient();
    const doc = await payload.findByID({
      collection: 'products',
      id: trimmed,
      depth: 2,
    });
    if (!doc || typeof doc !== 'object') return undefined;
    const product = mapPayloadProductToCommerceProduct(doc as PayloadProductDoc);
    if (!isVisibleProduct(product)) return undefined;
    return product;
  } catch {
    return undefined;
  }
}

async function fetchPayloadProducts(opts?: {
  query?: string;
  reverse?: boolean;
  sortKey?: SortKey;
  limit?: number;
}): Promise<Product[]> {
  const payload = await getPayloadClient();
  const where: Where = opts?.query
    ? {
        or: [
          { title: { contains: opts.query } },
          { description: { contains: opts.query } },
          { slug: { contains: opts.query } },
        ],
      }
    : {};

  const result = await payload.find({
    collection: 'products',
    where,
    depth: 2,
    limit: opts?.limit ?? 100,
    sort: opts?.sortKey === 'PRICE' ? 'price' : '-updatedAt',
    pagination: false,
  });

  const products = pickDocs<PayloadProductDoc>(result)
    .map(mapPayloadProductToCommerceProduct)
    .filter(isVisibleProduct);

  return sortProducts(products, opts?.sortKey, opts?.reverse);
}

function catalogProductsCacheKey(opts?: {
  query?: string;
  reverse?: boolean;
  sortKey?: SortKey;
  limit?: number;
}): string {
  return JSON.stringify({
    query: opts?.query ?? '',
    reverse: opts?.reverse ?? false,
    sortKey: opts?.sortKey ?? 'CREATED_AT',
    limit: opts?.limit ?? 100,
  });
}

export async function getPayloadProducts(opts?: {
  query?: string;
  reverse?: boolean;
  sortKey?: SortKey;
  limit?: number;
}): Promise<Product[]> {
  return unstable_cache(
    () => fetchPayloadProducts(opts),
    ['payload-products', catalogProductsCacheKey(opts)],
    { revalidate: CATALOG_REVALIDATE, tags: ['catalog', 'products'] },
  )();
}

async function fetchPayloadProductsByCategorySlug(
  slug: string,
  opts?: { reverse?: boolean; sortKey?: SortKey },
): Promise<Product[]> {
  const categorySlug = slug.trim();
  if (!categorySlug) return getPayloadProducts(opts);

  const payload = await getPayloadClient();
  const categoryResult = await payload.find({
    collection: 'categories',
    where: { slug: { equals: categorySlug } },
    depth: 0,
    limit: 1,
    pagination: false,
  });
  const categoryDoc = pickFirstDoc<CategoryDoc>(categoryResult);
  if (!categoryDoc) return [];

  const result = await payload.find({
    collection: 'products',
    where: { category: { contains: categoryDoc.id } },
    depth: 2,
    limit: 200,
    pagination: false,
  });

  const products = pickDocs<PayloadProductDoc>(result)
    .map(mapPayloadProductToCommerceProduct)
    .filter(isVisibleProduct);

  return sortProducts(products, opts?.sortKey, opts?.reverse);
}

export async function getPayloadProductsByCategorySlug(
  slug: string,
  opts?: { reverse?: boolean; sortKey?: SortKey },
): Promise<Product[]> {
  const categorySlug = slug.trim();
  const cacheKey = JSON.stringify({
    slug: categorySlug,
    reverse: opts?.reverse ?? false,
    sortKey: opts?.sortKey ?? 'CREATED_AT',
  });

  return unstable_cache(
    () => fetchPayloadProductsByCategorySlug(categorySlug, opts),
    ['payload-products-by-category', cacheKey],
    { revalidate: CATALOG_REVALIDATE, tags: ['catalog', 'products', `category:${categorySlug}`] },
  )();
}

export async function getPayloadProductRecommendations(
  slug: string,
  categoryIds: Array<string | number> = [],
): Promise<Product[]> {
  const payload = await getPayloadClient();
  const where: Where =
    categoryIds.length > 0
      ? {
          and: [
            { slug: { not_equals: slug } },
            { available: { equals: true } },
            { category: { in: categoryIds } },
          ],
        }
      : {
          and: [{ slug: { not_equals: slug } }, { available: { equals: true } }],
        };

  const result = await payload.find({
    collection: 'products',
    where,
    depth: 2,
    limit: 4,
    sort: '-updatedAt',
    pagination: false,
  });

  return pickDocs<PayloadProductDoc>(result)
    .map(mapPayloadProductToCommerceProduct)
    .filter(isVisibleProduct)
    .slice(0, 3);
}

export async function loadPayloadProductDoc(slug: string): Promise<PayloadProductDoc | null> {
  const trimmed = slug?.trim();
  if (!trimmed) return null;

  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'products',
    where: { slug: { equals: trimmed } },
    depth: 2,
    limit: 1,
    pagination: false,
  });

  return pickFirstDoc<PayloadProductDoc>(result);
}

async function fetchPayloadCollections(): Promise<Collection[]> {
  const payload = await getPayloadClient();
  const categoryResult = await payload.find({
    collection: 'categories',
    limit: 100,
    sort: 'title',
    pagination: false,
    depth: 0,
  });

  const all: Collection = {
    handle: '',
    title: 'Tất cả',
    description: 'Toàn bộ sản phẩm trong cửa hàng',
    seo: { title: 'Tất cả', description: 'Toàn bộ sản phẩm trong cửa hàng' },
    path: '/search',
    updatedAt: new Date().toISOString(),
  };

  const collections: Collection[] = [all];

  const categoryDocs = pickDocs<CategoryDoc>(categoryResult).sort(
    (a, b) => getDefaultCategoryOrder(a.slug) - getDefaultCategoryOrder(b.slug),
  );

  for (const doc of categoryDocs) {
    if (!doc.slug) continue;
    const subtitle =
      typeof doc.subtitle === 'string' && doc.subtitle.trim().length > 0
        ? doc.subtitle.trim()
        : `Sản phẩm thuộc ${doc.title}`;
    const meta = doc.meta ?? {};
    collections.push({
      handle: doc.slug,
      title: doc.title,
      description: subtitle,
      seo: {
        title: meta.title?.trim() || doc.title,
        description: meta.description?.trim() || subtitle,
      },
      path: `/search/${doc.slug}`,
      updatedAt: doc.updatedAt ?? new Date().toISOString(),
    });
  }

  return collections;
}

export const getPayloadCollections = unstable_cache(fetchPayloadCollections, ['payload-collections'], {
  revalidate: CATALOG_REVALIDATE,
  tags: ['catalog', 'collections'],
});

export async function getPayloadStoreCategories(): Promise<StoreCategory[]> {
  const collections = await getPayloadCollections();
  return collections.filter((c) => c.handle !== '').map(toStoreCategory);
}

export async function getPayloadProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (unique.length === 0) return [];

  const payload = await getPayloadClient();
  const result = await payload.find({
    collection: 'products',
    where: { id: { in: unique } },
    depth: 2,
    limit: unique.length,
    pagination: false,
  });

  const byId = new Map(
    pickDocs<PayloadProductDoc>(result)
      .map(mapPayloadProductToCommerceProduct)
      .filter(isVisibleProduct)
      .map((product) => [product.id, product]),
  );

  return unique.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}
