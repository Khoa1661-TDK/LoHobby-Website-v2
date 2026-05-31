// src/payload/collections/Products.ts
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeReadHook,
  CollectionConfig,
  FieldHook,
  Validate,
} from 'payload';
import { after } from 'next/server';
import { payloadPublicReadAdminWrite } from '@/lib/payload-access';
import {
  ON_SALE_CATEGORY_SLUG,
  ON_SALE_CATEGORY_SUBTITLE,
  ON_SALE_CATEGORY_TITLE,
} from '@/lib/default-categories';
import {
  isMediaResync,
  isPayloadAdminRequest,
  isSnapshotBackfill,
  SNAPSHOT_BACKFILL_CONTEXT,
} from '@/lib/payload-hooks';
import { revalidateCatalogCache } from '@/lib/payload-products';
import { sanitizeProductDocForAdmin } from '@/lib/admin-product-doc';
import { buildProductSnapshotPatch, stripIncomingSnapshotFields } from '@/lib/product-snapshot-patch';
import { scheduleDebouncedProductSnapshotBackfill } from '@/lib/product-snapshot-scheduler';
import { resolveMediaId, sameImageUrl, type StoredImage } from '@/lib/product-image-snapshot';
import { slugifyVietnamese, resolveCollectionSlug } from '@/lib/slugify';
import { groups } from '@/src/payload/groups';

const coerceVndInteger: FieldHook = ({ value }) => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.round(numeric));
};

const autoSlugFromTitle: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (!data || isMediaResync(req) || isSnapshotBackfill(req)) return data;

  const originalTitle = typeof originalDoc?.title === 'string' ? originalDoc.title : '';
  const originalSlug = typeof originalDoc?.slug === 'string' ? originalDoc.slug : '';
  const titleChanged = typeof data.title === 'string' && data.title !== originalTitle;
  const slugTouched = typeof data.slug === 'string' && data.slug !== originalSlug;

  if (operation === 'update' && !titleChanged && !slugTouched) {
    return data;
  }

  const slug = await resolveCollectionSlug(req.payload, 'products', {
    title: typeof data.title === 'string' ? data.title : undefined,
    slug: typeof data.slug === 'string' ? data.slug : undefined,
    excludeId: operation === 'update' ? originalDoc?.id : undefined,
  });

  if (slug && slug !== (typeof data.slug === 'string' ? data.slug : originalSlug)) {
    data.slug = slug;
  }

  return data;
};

/** Extract the relationship id from a hasMany relationship row (id or populated doc). */
function relationshipId(value: unknown): string | number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === 'string' || typeof id === 'number') return id;
  }
  return null;
}

/**
 * Keep the curated "On Sale" category in sync with the `onSale` checkbox.
 *
 * When a product is marked on sale we add the On Sale category (creating it on
 * first use so admins never have to set it up by hand); when it is unmarked we
 * remove it. This is what makes a discounted product appear at /search/on-sale
 * and in the On Sale homepage section automatically.
 */
const syncOnSaleCategory: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data || isMediaResync(req) || isSnapshotBackfill(req)) return data;

  if (data.onSale === undefined && data.category === undefined) return data;

  // Fall back to the saved doc for fields omitted from a partial update so we
  // never wipe categories or flip the sale flag when another hook saves the
  // product with just a couple of fields (e.g. media re-sync / detach).
  const onSale = (data.onSale !== undefined ? data.onSale : originalDoc?.onSale) === true;
  const sourceCategory = data.category !== undefined ? data.category : originalDoc?.category;

  const existingIds = Array.isArray(sourceCategory)
    ? sourceCategory.map(relationshipId).filter((id): id is string | number => id !== null)
    : [];

  // Resolve the On Sale category id, creating the category if it doesn't exist.
  let onSaleId: string | number | null = null;
  try {
    const found = await req.payload.find({
      collection: 'categories',
      where: { slug: { equals: ON_SALE_CATEGORY_SLUG } },
      limit: 1,
      depth: 0,
      pagination: false,
    });
    onSaleId = found?.docs?.[0]?.id ?? null;

    if (onSaleId === null && onSale) {
      const created = await req.payload.create({
        collection: 'categories',
        data: {
          title: ON_SALE_CATEGORY_TITLE,
          slug: ON_SALE_CATEGORY_SLUG,
          subtitle: ON_SALE_CATEGORY_SUBTITLE,
        },
      });
      onSaleId = created?.id ?? null;
    }
  } catch (error) {
    console.error('[products.syncOnSaleCategory] failed to resolve On Sale category:', error);
    return data;
  }

  if (onSaleId === null) return data;

  const withoutOnSale = existingIds.filter((id) => String(id) !== String(onSaleId));
  const nextCategory = onSale ? [...withoutOnSale, onSaleId] : withoutOnSale;
  const currentKey = existingIds.map(String).sort().join(',');
  const nextKey = nextCategory.map(String).sort().join(',');

  if (currentKey !== nextKey) {
    data.category = nextCategory;
  }

  return data;
};

/** Keep category values as numeric IDs so the admin form does not fight populated objects. */
const normalizeCategoryIds: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!data || isMediaResync(req) || isSnapshotBackfill(req)) return data;
  if (!Array.isArray(data.category)) return data;

  data.category = data.category
    .map(relationshipId)
    .filter((id): id is string | number => id !== null);

  return data;
};

/** Remove duplicate main image from gallery when the main image changes. */
const dedupeGalleryOnMainImageChange: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (!data || isMediaResync(req) || isSnapshotBackfill(req)) return data;

  const prevImageId = resolveMediaId(originalDoc?.image);
  const nextImageId = data.image !== undefined ? resolveMediaId(data.image) : prevImageId;
  const imageChanged = String(nextImageId ?? '') !== String(prevImageId ?? '');

  if (!imageChanged || prevImageId === null) return data;

  const prevStoredUrl =
    typeof originalDoc?.storedImage === 'object' &&
    originalDoc.storedImage !== null &&
    typeof originalDoc.storedImage.url === 'string'
      ? originalDoc.storedImage.url
      : null;

  const galleryRows = Array.isArray(data.gallery)
    ? data.gallery
    : Array.isArray(originalDoc?.gallery)
      ? originalDoc.gallery
      : [];

  data.gallery = galleryRows.filter((item: unknown) => {
    if (!item || typeof item !== 'object') return false;
    const mediaId = resolveMediaId((item as { media?: unknown }).media);
    return mediaId === null || String(mediaId) !== String(prevImageId);
  });

  if (prevStoredUrl && Array.isArray(data.storedGallery)) {
    data.storedGallery = (data.storedGallery as StoredImage[]).filter(
      (item) => !item?.url?.trim() || !sameImageUrl(item.url, prevStoredUrl),
    );
  }

  return data;
};

/** Normalize admin API responses so relationship fields stay as IDs (prevents save loops). */
const sanitizeForAdminRead: CollectionBeforeReadHook = ({ doc, req }) => {
  if (!doc || !isPayloadAdminRequest(req)) return doc;
  return sanitizeProductDocForAdmin(doc as Record<string, unknown>);
};

const stripSnapshotsFromIncomingSave: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!data || isMediaResync(req) || isSnapshotBackfill(req)) return data;
  stripIncomingSnapshotFields(data as Record<string, unknown>);
  return data;
};

/** Write snapshots in the background; return a normalized doc so the admin form stays stable. */
const backfillProductSnapshots: CollectionAfterChangeHook = ({ doc, req }) => {
  if (!doc || isMediaResync(req) || isSnapshotBackfill(req)) {
    return doc && isPayloadAdminRequest(req)
      ? sanitizeProductDocForAdmin(doc as Record<string, unknown>)
      : doc;
  }

  const productId = doc.id;

  scheduleDebouncedProductSnapshotBackfill(productId, async () => {
    try {
      const fresh = await req.payload.findByID({
        collection: 'products',
        id: productId,
        depth: 0,
        overrideAccess: true,
      });
      if (!fresh || typeof fresh !== 'object') return;

      const patch = await buildProductSnapshotPatch(
        req.payload,
        fresh as Parameters<typeof buildProductSnapshotPatch>[1],
        { useRetry: false },
      );
      if (!patch) return;

      await req.payload.update({
        collection: 'products',
        id: productId,
        data: patch,
        context: SNAPSHOT_BACKFILL_CONTEXT,
        depth: 0,
        overrideAccess: true,
      });
    } catch (error) {
      console.error('[products.backfillProductSnapshots] failed:', error);
    }
  });

  const docForBackfill = doc as Record<string, unknown>;

  return isPayloadAdminRequest(req)
    ? sanitizeProductDocForAdmin(docForBackfill)
    : doc;
};

function hasStoredImageUrl(stored: unknown): boolean {
  return (
    typeof stored === 'object' &&
    stored !== null &&
    'url' in stored &&
    typeof (stored as { url?: unknown }).url === 'string' &&
    (stored as { url: string }).url.trim().length > 0
  );
}

const validateProductImage: Validate = (value, args) => {
  if (value) return true;

  const { data } = args;
  const originalDoc = (args as { originalDoc?: { storedImage?: unknown } }).originalDoc;

  const stored =
    (data && typeof data === 'object' && 'storedImage' in data
      ? (data as { storedImage?: unknown }).storedImage
      : undefined) ?? originalDoc?.storedImage;

  if (hasStoredImageUrl(stored)) return true;

  return 'Please select a product image.';
};

/** Flush storefront catalog caches after the admin response returns. */
const invalidateCatalogOnChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (isMediaResync(req) || isSnapshotBackfill(req)) return doc;
  after(() => {
    revalidateCatalogCache();
  });
  return doc;
};

const invalidateCatalogOnDelete: CollectionAfterDeleteHook = ({ doc }) => {
  after(() => {
    revalidateCatalogCache();
  });
  return doc;
};

const storedImageFields = [
  {
    name: 'url',
    type: 'text' as const,
  },
  {
    name: 'alt',
    type: 'text' as const,
  },
  {
    name: 'width',
    type: 'number' as const,
  },
  {
    name: 'height',
    type: 'number' as const,
  },
  {
    name: 'kind',
    type: 'select' as const,
    options: [
      { label: 'Image', value: 'image' },
      { label: 'Video', value: 'video' },
    ],
    admin: {
      readOnly: true,
    },
  },
];

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    group: groups.products.name,
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'price', 'onSale', 'salePercent', 'available', 'updatedAt'],
    description: 'Create products here, then assign categories so they appear on the storefront.',
  },
  access: payloadPublicReadAdminWrite,
  hooks: {
    beforeChange: [
      autoSlugFromTitle,
      syncOnSaleCategory,
      normalizeCategoryIds,
      dedupeGalleryOnMainImageChange,
      stripSnapshotsFromIncomingSave,
    ],
    beforeRead: [sanitizeForAdminRead],
    afterChange: [backfillProductSnapshots, invalidateCatalogOnChange],
    afterDelete: [invalidateCatalogOnDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      required: true,
      admin: {
        description:
          'Where the product is listed (homepage sections, search filters). Create categories first under Categories. The "On Sale" category is managed automatically by the On Sale checkbox below.',
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description:
          'Auto-generated from the title when empty. You can edit manually — saving normalizes it to a URL-safe slug.',
      },
      hooks: {
        beforeValidate: [
          ({ value }) => {
            if (typeof value !== 'string' || !value.trim()) return value;
            return slugifyVietnamese(value);
          },
        ],
      },
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      min: 0,
      admin: {
        step: 1,
        description: 'Price in VND (integer). Example: 150000 displays as 150,000₫.',
      },
      hooks: {
        beforeValidate: [coerceVndInteger],
      },
    },
    {
      name: 'onSale',
      type: 'checkbox',
      defaultValue: false,
      label: 'On Sale',
      admin: {
        description:
          'Tick to put this product on sale. It is added to the "On Sale" category automatically and the storefront shows the reduced price with the original struck through.',
      },
    },
    {
      name: 'salePercent',
      type: 'number',
      min: 1,
      max: 99,
      defaultValue: 10,
      label: 'Discount (%)',
      admin: {
        step: 1,
        description: 'Percentage off the price. Example: 20 turns 150,000₫ into 120,000₫.',
        condition: (_data, sibling) => sibling?.onSale === true,
      },
      hooks: {
        beforeValidate: [
          ({ value }) => {
            if (value === null || value === undefined || value === '') return undefined;
            const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
            if (!Number.isFinite(numeric)) return undefined;
            return Math.min(99, Math.max(1, Math.round(numeric)));
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'available',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'When unchecked, the product is hidden from the storefront.',
      },
    },
    {
      name: 'stock',
      type: 'number',
      min: 0,
      label: 'Stock quantity',
      admin: {
        description:
          'Inventory for products without variants. Leave empty for unlimited stock. Variant products use per-variant stock instead.',
        step: 1,
      },
      hooks: {
        beforeValidate: [coerceVndInteger],
      },
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      validate: validateProductImage,
      admin: {
        description:
          'Main product photo shown first on the storefront. Replacing it removes the previous main image from the extra gallery automatically.',
      },
    },
    {
      name: 'storedImage',
      type: 'group',
      admin: {
        hidden: true,
        readOnly: true,
        description: 'Snapshotted image URL (auto-filled on save). The storefront reads this field.',
      },
      fields: storedImageFields,
    },
    {
      name: 'gallery',
      type: 'array',
      label: 'Gallery (images & videos)',
      admin: {
        description:
          'Add a row, pick or upload an image/video, wait until the thumbnail appears, then pause a few seconds before clicking Save. The gallery snapshot updates in the background so the editor stays responsive.',
      },
      fields: [
        {
          name: 'media',
          type: 'upload',
          relationTo: 'media',
        },
      ],
    },
    {
      name: 'storedGallery',
      type: 'array',
      label: 'Gallery (snapshotted)',
      admin: {
        hidden: true,
        readOnly: true,
        description: 'Snapshotted gallery URLs and media type — auto-filled when the product is saved.',
      },
      fields: storedImageFields,
    },
    {
      name: 'variants',
      type: 'join',
      collection: 'product-variants',
      on: 'product',
      // Default join maxDepth is 1 (variant rows only). Need 2 so each variant's `image` upload hydrates.
      maxDepth: 2,
      label: 'Product variants',
      admin: {
        description:
          'Save the product first, then use "Create new" to add variants (name, SKU, stock, image). Each variant is linked to this product automatically — no need to pick the product again.',
        allowCreate: true,
        defaultColumns: ['name', 'sku', 'stock', 'priceOverride'],
      },
      defaultLimit: 0,
    },
  ],
};
