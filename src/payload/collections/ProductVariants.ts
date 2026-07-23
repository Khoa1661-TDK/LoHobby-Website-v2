// src/payload/collections/ProductVariants.ts
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldHook,
} from 'payload';
import { after } from 'next/server';
import { payloadPublicReadAdminWrite } from '@/lib/payload-access';
import { resolveParentProductIdFromRequest } from '@/lib/payload-variant-context';
import { revalidateCatalogCache } from '@/lib/payload-products';

const coerceVndInteger: FieldHook = ({ value }) => {
  if (value === null || value === undefined || value === '') return undefined;
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(0, Math.round(numeric));
};

/** Auto-link to the product you opened this variant from (hidden field in admin). */
const assignParentProduct: CollectionBeforeChangeHook = ({ data, operation, req }) => {
  if (!data || data.product) return data;

  const parentId = resolveParentProductIdFromRequest(req);
  if (parentId !== null) {
    data.product = parentId;
  }

  return data;
};

// Schedule cache revalidation after the HTTP response. When a variant is written
// outside a request scope (CLI seed scripts), `after()` throws — and there is no
// live server cache to revalidate anyway, so it is safely skipped. Mirrors the
// same guard in the Products collection (`scheduleCatalogRevalidate`).
function scheduleCatalogRevalidate(): void {
  try {
    after(() => {
      revalidateCatalogCache();
    });
  } catch {
    // Not in a request scope (e.g. a seed/CLI script) — nothing to revalidate.
  }
}

const invalidateCatalogOnChange: CollectionAfterChangeHook = ({ doc }) => {
  scheduleCatalogRevalidate();
  return doc;
};

const invalidateCatalogOnDelete: CollectionAfterDeleteHook = ({ doc }) => {
  scheduleCatalogRevalidate();
  return doc;
};

export const ProductVariants: CollectionConfig = {
  slug: 'product-variants',
  admin: {
    useAsTitle: 'name',
    hidden: true,
    defaultColumns: ['name', 'sku', 'product', 'stock', 'updatedAt'],
    description:
      'Managed from each product’s Variants field. Each variant saves on its own so image uploads do not freeze the product editor.',
  },
  access: payloadPublicReadAdminWrite,
  hooks: {
    beforeChange: [assignParentProduct],
    afterChange: [invalidateCatalogOnChange],
    afterDelete: [invalidateCatalogOnDelete],
  },
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      index: true,
      admin: {
        hidden: true,
        description: 'Set automatically when you add a variant from a product page.',
      },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
      localized: true,
      admin: {
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
        placeholder: 'e.g. KB-PRO-BLK-LIN',
        description: 'Unique SKU (global).',
      },
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
        description: 'Optional. Shown on the storefront when this variant is selected.',
      },
    },
  ],
};
