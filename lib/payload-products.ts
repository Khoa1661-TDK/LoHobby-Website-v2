// lib/payload-products.ts — Payload CMS as the single catalog source for the storefront
import config from '@payload-config';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { revalidateTag, unstable_cache } from 'next/cache';
import { getPayload, type Where } from 'payload';
import { toStoreCategory, type StoreCategory } from '@/lib/categories';
import { getDefaultCategoryOrder } from '@/lib/default-categories';
import { HIDDEN_PRODUCT_TAG } from '@/lib/constants';
import {
  normalizeProductImageUrl,
  resolveMediaId,
  sameImageUrl,
  type StoredImage,
} from '@/lib/product-image-snapshot';
import type { Collection, Image, Money, Product, SortKey } from '@/lib/shopify/types';

const PLACEHOLDER = '/images/placeholder.svg';
const CATALOG_REVALIDATE = 60;

type MediaDoc = {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
};

export type CategoryFaqItem = {
  question?: string | null;
  answer?: string | null;
};

export type CategoryDoc = {
  id: string | number;
  title: string;
  slug: string;
  subtitle?: string | null;
  content?: SerializedEditorState | null;
  faq?: CategoryFaqItem[] | null;
  meta?: SeoMeta | null;
  updatedAt?: string;
};

type SeoMeta = {
  title?: string | null;
  description?: string | null;
  image?: MediaDoc | string | null;
  keywords?: string | null;
};

export type PayloadProductVariantDoc = {
  id?: string | number | null;
  name: string;
  sku: string;
  /** VND integer. `null`/`undefined` means "inherit base product price". */
  priceOverride?: number | null;
  stock?: number | null;
  image?: MediaDoc | string | number | null;
  /**
   * URL snapshot written by the `snapshotProductImages` hook. Survives the
   * underlying media doc being deleted; storefront prefers this over `image`.
   */
  storedImage?: StoredImage | null;
};

export type PayloadProductDoc = {
  id: string | number;
  title: string;
  slug: string;
  price: number;
  /** When true, `salePercent` is applied to derive the reduced storefront price. */
  onSale?: boolean | null;
  /** Whole-number discount percentage (1–99) applied when `onSale` is true. */
  salePercent?: number | null;
  description?: string | null;
  available?: boolean | null;
  tags?: string[] | null;
  category?: Array<CategoryDoc | string | number> | null;
  image?: MediaDoc | string | null;
  storedImage?: StoredImage | null;
  gallery?: Array<{ media?: MediaDoc | string | null } | null> | null;
  storedGallery?: StoredImage[] | null;
  variants?: PayloadProductVariantDoc[] | null;
  meta?: SeoMeta | null;
  createdAt: string;
  updatedAt: string;
};

/** Storefront-friendly variant shape (raw VND integer for `price`). */
export type StorefrontVariant = {
  sku: string;
  name: string;
  /**
   * Whole VND integer the customer pays. Either `priceOverride` or the base
   * product price, with any active sale discount already applied.
   */
  price: number;
  /**
   * Original whole-VND price before the sale discount, or `null` when the
   * product isn't on sale. UI renders this struck-through.
   */
  compareAtPrice: number | null;
  inStock: boolean;
  stock: number;
  image: Image | null;
};

/**
 * Resolve a product's effective sale pricing from the `onSale` / `salePercent`
 * fields. `price` is the amount the customer pays; `compareAt` is the original
 * price to strike through (null when not discounted). Applying the percentage
 * to any base amount (product or variant) keeps every surface consistent.
 */
export function computeSalePrice(
  baseAmount: number,
  doc: Pick<PayloadProductDoc, 'onSale' | 'salePercent'>,
): { price: number; compareAt: number | null } {
  const base = Math.max(0, Math.round(baseAmount));
  if (doc.onSale !== true) return { price: base, compareAt: null };

  const rawPercent =
    typeof doc.salePercent === 'number' && Number.isFinite(doc.salePercent)
      ? doc.salePercent
      : 0;
  const percent = Math.min(99, Math.max(0, Math.round(rawPercent)));
  if (percent <= 0) return { price: base, compareAt: null };

  const sale = Math.max(0, Math.round(base * (1 - percent / 100)));
  if (sale >= base) return { price: base, compareAt: null };
  return { price: sale, compareAt: base };
}

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

  const remember = (image: Image): void => {
    const key = normalizeProductImageUrl(image.url).split('?')[0] ?? image.url;
    if (seen.has(key)) return;
    seen.add(key);
    images.push(image);
  };

  const primaryMedia = resolveMedia(doc.image);
  const primaryId = resolveMediaId(doc.image);

  // Primary image first — live upload relationship wins over the snapshot.
  if (primaryMedia?.url?.trim()) {
    remember(
      toImage(
        primaryMedia.url,
        primaryMedia.alt ?? doc.title,
        primaryMedia.width,
        primaryMedia.height,
      ),
    );
  } else if (doc.storedImage?.url?.trim()) {
    remember(
      toImage(
        doc.storedImage.url,
        doc.storedImage.alt ?? doc.title,
        doc.storedImage.width,
        doc.storedImage.height,
      ),
    );
  }

  const isPrimaryDuplicate = (url: string | null | undefined, mediaId: string | number | null): boolean => {
    if (primaryId !== null && mediaId !== null && String(primaryId) === String(mediaId)) {
      return true;
    }
    if (doc.storedImage?.url && url && sameImageUrl(doc.storedImage.url, url)) {
      return true;
    }
    if (primaryMedia?.url && url && sameImageUrl(primaryMedia.url, url)) {
      return true;
    }
    return false;
  };

  const pushGalleryStored = (stored: StoredImage | null | undefined) => {
    if (!stored?.url?.trim() || isPrimaryDuplicate(stored.url, null)) return;
    remember(toImage(stored.url, stored.alt ?? doc.title, stored.width, stored.height));
  };

  const pushGalleryMedia = (media: MediaDoc | null) => {
    if (!media?.url?.trim()) return;
    const mediaId = resolveMediaId(media);
    if (isPrimaryDuplicate(media.url, mediaId)) return;
    remember(toImage(media.url, media.alt ?? doc.title, media.width, media.height));
  };

  if (Array.isArray(doc.storedGallery)) {
    for (const item of doc.storedGallery) {
      pushGalleryStored(item);
    }
  }

  if (Array.isArray(doc.gallery)) {
    for (const item of doc.gallery) {
      pushGalleryMedia(resolveMedia(item?.media));
    }
  }

  if (images.length === 0) {
    images.push(toImage(PLACEHOLDER, doc.title));
  }

  return images;
}

/**
 * Resolve the inline `variants` array into clean storefront rows.
 *
 * Requires the source `doc` to have been loaded with `depth >= 2` so each
 * variant's `image` relationship is hydrated to a Media doc (URL + dimensions).
 * Variants whose `priceOverride` is null/undefined inherit `basePrice`. All
 * prices stay as raw VND integers — never floats, never minor units.
 */
export function resolveVariants(doc: PayloadProductDoc): StorefrontVariant[] {
  if (!Array.isArray(doc.variants) || doc.variants.length === 0) return [];

  const basePrice = Math.max(0, Math.round(doc.price));
  const fallbackAlt = doc.title;

  return doc.variants
    .filter((v): v is PayloadProductVariantDoc => Boolean(v && v.sku && v.name))
    .map((variant) => {
      const overridden =
        typeof variant.priceOverride === 'number' && Number.isFinite(variant.priceOverride)
          ? Math.max(0, Math.round(variant.priceOverride))
          : null;

      const stock = typeof variant.stock === 'number' && Number.isFinite(variant.stock)
        ? Math.max(0, Math.round(variant.stock))
        : 0;

      // Prefer the URL snapshot (immune to media deletion) over the live
      // upload relationship — same priority as the main product image.
      let image: Image | null = null;

      const stored = variant.storedImage;
      if (stored && typeof stored.url === 'string' && stored.url.trim().length > 0) {
        image = toImage(stored.url, stored.alt ?? fallbackAlt, stored.width, stored.height);
      } else {
        const media = resolveMedia(
          // Variant images come back as MediaDoc objects when depth >= 2; otherwise as IDs.
          typeof variant.image === 'object' && variant.image !== null && 'url' in variant.image
            ? (variant.image as MediaDoc)
            : null,
        );
        if (media?.url) {
          image = toImage(media.url, media.alt ?? fallbackAlt, media.width, media.height);
        }
      }

      const { price, compareAt } = computeSalePrice(overridden ?? basePrice, doc);

      return {
        sku: variant.sku.trim(),
        name: variant.name.trim(),
        price,
        compareAtPrice: compareAt,
        stock,
        inStock: stock > 0,
        image,
      };
    });
}

export function mapPayloadProductToCommerceProduct(doc: PayloadProductDoc): Product {
  const slug = doc.slug?.trim() || String(doc.id);
  const title = doc.title.trim();
  const description = typeof doc.description === 'string' ? doc.description : '';
  const { price: salePrice, compareAt } = computeSalePrice(doc.price, doc);
  const price: Money = {
    amount: salePrice.toString(),
    currencyCode: 'VND',
    compareAtAmount: compareAt !== null ? compareAt.toString() : null,
  };
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

/**
 * Returns true when a product can be purchased: visible in the storefront AND
 * marked as available. Use this in cart / checkout flows so admins can disable
 * a SKU mid-day without a stale cart sneaking it through.
 */
export function isPurchasableProduct(product: Product): boolean {
  return isVisibleProduct(product) && product.availableForSale;
}

/** Cache tags shared by every catalog-read cache; flush them after a Payload write. */
export const CATALOG_CACHE_TAGS = ['catalog', 'products', 'collections'] as const;

/**
 * Invalidate every cached catalog read. Wire this into Payload `afterChange`
 * / `afterDelete` hooks on products & categories so the storefront updates
 * within one request instead of after the 60s TTL.
 */
export function revalidateCatalogCache(): void {
  try {
    for (const tag of CATALOG_CACHE_TAGS) {
      revalidateTag(tag);
    }
  } catch (error) {
    // Safe outside a Next.js request (seed scripts) and during Payload admin saves
    // where the static-generation store may be unavailable.
    console.warn('[catalog] revalidate skipped:', error instanceof Error ? error.message : error);
  }
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
    const faq = Array.isArray(doc.faq)
      ? doc.faq
          .map((item) => ({
            question: typeof item?.question === 'string' ? item.question.trim() : '',
            answer: typeof item?.answer === 'string' ? item.answer.trim() : '',
          }))
          .filter((item) => item.question.length > 0 && item.answer.length > 0)
      : [];
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
      content: doc.content ?? null,
      faq,
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

export async function getPayloadProductsByIds(
  ids: string[],
  options: { requirePurchasable?: boolean } = {},
): Promise<Product[]> {
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

  const filter = options.requirePurchasable ? isPurchasableProduct : isVisibleProduct;

  const byId = new Map(
    pickDocs<PayloadProductDoc>(result)
      .map(mapPayloadProductToCommerceProduct)
      .filter(filter)
      .map((product) => [product.id, product]),
  );

  return unique.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));
}
