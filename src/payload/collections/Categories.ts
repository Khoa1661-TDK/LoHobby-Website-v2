// src/payload/collections/Categories.ts
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload';
import { after } from 'next/server';

import { payloadPublicReadAdminWrite } from '@/lib/payload-access';
import { revalidateCatalogCache } from '@/lib/payload-products';
import { resolveCollectionSlug, slugifyVietnamese } from '@/lib/slugify';
import { groups } from '@/src/payload/groups';

const autoSlugFromTitle: CollectionBeforeChangeHook = async ({ data, operation, originalDoc, req }) => {
  if (!data) return data;

  const slug = await resolveCollectionSlug(req.payload, 'categories', {
    title: typeof data.title === 'string' ? data.title : undefined,
    slug: typeof data.slug === 'string' ? data.slug : undefined,
    excludeId: operation === 'update' ? originalDoc?.id : undefined,
  });

  if (slug) {
    data.slug = slug;
  }

  return data;
};

// Cache revalidation is scheduled via next/server `after()`, which throws when a
// category is written outside a request scope (CLI seed scripts). There is no live
// server cache to revalidate there, so the revalidation is safely skipped.
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

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    group: groups.products.name,
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'updatedAt'],
    description: 'Store categories. Assign products to categories from the Products collection.',
  },
  access: payloadPublicReadAdminWrite,
  hooks: {
    beforeChange: [autoSlugFromTitle],
    afterChange: [invalidateCatalogOnChange],
    afterDelete: [invalidateCatalogOnDelete],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
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
      name: 'subtitle',
      type: 'textarea',
      localized: true,
      admin: {
        description: 'Short line shown on the homepage and category page heading.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      admin: {
        description:
          'Long-form SEO copy rendered on the category landing page (below the banner, above the product grid). Use H2/H3 headings, lists and links to build topical depth for the target keyword.',
      },
    },
    {
      name: 'faq',
      type: 'array',
      label: 'FAQ',
      labels: { singular: 'FAQ item', plural: 'FAQ items' },
      admin: {
        description:
          'Frequently asked questions shown on the category landing page. Rendered on-page and emitted as FAQPage JSON-LD for rich results.',
        initCollapsed: true,
      },
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
          admin: {
            placeholder: 'Đồ chơi in 3D có an toàn cho bé không?',
          },
        },
        {
          name: 'answer',
          type: 'textarea',
          required: true,
          admin: {
            placeholder:
              'Có. Chúng tôi dùng nhựa PLA gốc thực vật, không độc, an toàn cho trẻ em.',
          },
        },
      ],
    },
  ],
};
