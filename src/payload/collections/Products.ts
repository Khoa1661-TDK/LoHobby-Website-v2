// src/payload/collections/Products.ts
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
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
import { revalidateCatalogCache } from '@/lib/payload-products';
import { isMediaResync } from '@/lib/payload-hooks';
import {
  galleryMediaIdsEqual,
  loadMediaDocWithRetry,
  mediaDocToStored,
  resolveMediaId,
  sameImageUrl,
  type StoredImage,
} from '@/lib/product-image-snapshot';
import { slugifyVietnamese, resolveCollectionSlug } from '@/lib/slugify';

const coerceVndInteger: FieldHook = ({ value }) => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.round(numeric));
};

const autoSlugFromTitle: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (!data || isMediaResync(req)) return data;

  const slug = await resolveCollectionSlug(req.payload, 'products', {
    title: typeof data.title === 'string' ? data.title : undefined,
    slug: typeof data.slug === 'string' ? data.slug : undefined,
    excludeId: operation === 'update' ? originalDoc?.id : undefined,
  });

  if (slug) {
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
  if (!data || isMediaResync(req)) return data;

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
  data.category = onSale ? [...withoutOnSale, onSaleId] : withoutOnSale;

  return data;
};

function variantImageSignature(variants: unknown): string {
  if (!Array.isArray(variants)) return '';
  return variants
    .map((variant) => {
      if (!variant || typeof variant !== 'object') return '';
      const row = variant as Record<string, unknown>;
      const sku = typeof row.sku === 'string' ? row.sku.trim() : '';
      const imageId = resolveMediaId(row.image);
      return `${sku}:${imageId ?? ''}`;
    })
    .join('|');
}

/** Copy upload picks into storedImage / storedGallery so products keep URLs after media is deleted. */
const snapshotProductImages: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;

  const title =
    typeof data.title === 'string'
      ? data.title
      : typeof originalDoc?.title === 'string'
        ? originalDoc.title
        : 'Product';
  const fromMediaResync = isMediaResync(req);

  const prevImageId = resolveMediaId(originalDoc?.image);
  const nextImageId =
    data.image !== undefined ? resolveMediaId(data.image) : prevImageId;
  const imageChanged =
    String(nextImageId ?? '') !== String(prevImageId ?? '');

  if (imageChanged && prevImageId !== null) {
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

    const storedGalleryRows: StoredImage[] = Array.isArray(data.storedGallery)
      ? (data.storedGallery as StoredImage[])
      : Array.isArray(originalDoc?.storedGallery)
        ? (originalDoc.storedGallery as StoredImage[])
        : [];

    data.storedGallery = storedGalleryRows.filter((item: StoredImage) => {
      if (!item?.url?.trim()) return false;
      if (prevStoredUrl && sameImageUrl(item.url, prevStoredUrl)) return false;
      return true;
    });
  }

  if (nextImageId === null && imageChanged) {
    data.storedImage = null;
  } else if (nextImageId !== null && imageChanged) {
    const media = await loadMediaDocWithRetry(req.payload, data.image ?? nextImageId);
    const stored = mediaDocToStored(media, title);
    if (stored) {
      data.storedImage = stored;
    }
  } else if (nextImageId !== null && fromMediaResync) {
    const media = await loadMediaDocWithRetry(req.payload, data.image ?? nextImageId);
    const stored = mediaDocToStored(media, title);
    if (stored) {
      data.storedImage = stored;
    }
  }

  const galleryChanged =
    Array.isArray(data.gallery) &&
    (fromMediaResync || !galleryMediaIdsEqual(data.gallery, originalDoc?.gallery));

  if (galleryChanged && Array.isArray(data.gallery)) {
    const prevStored = Array.isArray(originalDoc?.storedGallery)
      ? (originalDoc.storedGallery as StoredImage[])
      : [];
    const storedGallery: StoredImage[] = [];

    for (let index = 0; index < data.gallery.length; index += 1) {
      const item = data.gallery[index];
      if (!item || typeof item !== 'object') continue;

      const media = await loadMediaDocWithRetry(req.payload, (item as { media?: unknown }).media);
      const stored = mediaDocToStored(media, title);
      if (stored) {
        storedGallery.push(stored);
        continue;
      }

      // Upload may still be committing — keep the previous snapshot for this slot.
      const previous = prevStored[index];
      if (previous?.url?.trim()) {
        storedGallery.push(previous);
      }
    }

    if (storedGallery.length > 0) {
      data.storedGallery = storedGallery;
    }
  }

  const variantsChanged =
    Array.isArray(data.variants) &&
    variantImageSignature(data.variants) !== variantImageSignature(originalDoc?.variants);

  if (variantsChanged || (fromMediaResync && Array.isArray(data.variants))) {
    for (const variant of data.variants ?? []) {
      if (!variant || typeof variant !== 'object') continue;
      const variantRow = variant as Record<string, unknown>;
      const imageRef = variantRow.image;
      if (imageRef === undefined || imageRef === null) continue;

      const altFallback =
        typeof variantRow.name === 'string' && variantRow.name.trim().length > 0
          ? variantRow.name
          : title;

      const media = await loadMediaDocWithRetry(req.payload, imageRef);
      const stored = mediaDocToStored(media, altFallback);
      if (stored) {
        variantRow.storedImage = stored;
      }
    }
  }

  return data;
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
  if (isMediaResync(req)) return doc;
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
];

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'price', 'onSale', 'salePercent', 'available', 'updatedAt'],
    description: 'Create products here, then assign categories so they appear on the storefront.',
  },
  access: payloadPublicReadAdminWrite,
  hooks: {
    beforeChange: [autoSlugFromTitle, syncOnSaleCategory, snapshotProductImages],
    afterChange: [invalidateCatalogOnChange],
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
      label: 'Extra images',
      admin: {
        description:
          'Add a row, upload the image, wait for the upload to finish, then save the product once with the main Save button (top-right). Do not save the media drawer separately before saving the product.',
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
      label: 'Extra images (snapshotted)',
      admin: {
        hidden: true,
        readOnly: true,
        description: 'Snapshotted gallery URLs — auto-filled when the product is saved.',
      },
      fields: storedImageFields,
    },
    {
      name: 'variants',
      type: 'array',
      label: 'Product variants',
      labels: { singular: 'Variant', plural: 'Variants' },
      admin: {
        description:
          'Optional. Multiple variants per product (e.g. color / switch). Leave "Price override" empty to use the main price.',
        initCollapsed: true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'name',
              type: 'text',
              required: true,
              admin: {
                width: '60%',
                placeholder: 'e.g. Black / Linear switch',
                description: 'Label on the variant selector button.',
              },
            },
            {
              name: 'sku',
              type: 'text',
              required: true,
              unique: true,
              index: true,
              admin: {
                width: '40%',
                placeholder: 'e.g. KB-PRO-BLK-LIN',
                description: 'Unique SKU for this variant.',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'priceOverride',
              type: 'number',
              min: 0,
              admin: {
                width: '50%',
                step: 1,
                placeholder: 'Leave empty for main price',
                description: 'VND integer. Empty = use the product price.',
              },
              hooks: {
                beforeValidate: [coerceVndInteger],
              },
            },
            {
              name: 'stock',
              type: 'number',
              min: 0,
              defaultValue: 0,
              required: true,
              admin: {
                width: '50%',
                step: 1,
                description: 'Stock for this variant only.',
              },
              hooks: {
                beforeValidate: [coerceVndInteger],
              },
            },
          ],
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description:
              'Optional. When this variant is selected on the storefront, it replaces the main image.',
          },
        },
        {
          name: 'storedImage',
          type: 'group',
          admin: {
            hidden: true,
            readOnly: true,
            description:
              'Snapshotted variant image URL (auto-filled on save). Keeps images working if the Media file is deleted.',
          },
          fields: storedImageFields,
        },
      ],
    },
  ],
};
