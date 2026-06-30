// src/payload/collections/Pages.ts — Shopify-style CMS page builder
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload';
import { after } from 'next/server';

import { payloadPublicReadAdminWrite } from '@/lib/payload-access';
import { resolveCollectionSlug } from '@/lib/slugify';
import { revalidatePageCache } from '@/lib/page-builder';
import { shouldPreserveSlug } from '@/lib/page-builder/slug';
import { groups } from '@/src/payload/groups';
import { capturePriorLayoutKeys, mirrorLocaleLayout } from '@/src/payload/hooks/mirror-locale-layout';
import {
  Hero,
  FeaturedCollection,
  FeaturedProducts,
  RichText,
  ImageWithText,
  Gallery,
  Testimonials,
  LogoCloud,
  Newsletter,
  FAQ,
  PromoBanner,
  VideoEmbed,
  Divider,
  Recommendations,
  RecentlyViewed,
  Button,
  Text,
  SocialBar,
  Spacer,
  Columns,
  CallToAction,
  Stats,
  Quote,
  CardGrid,
  Banner,
  Steps,
  PricingTable,
  Countdown,
  Tabs,
  FeatureGrid,
  ProductShowcase,
  Reels,
} from '@/src/payload/blocks';
import { blockKeyField } from '@/src/payload/blocks/_identity';

// Payload `blocks` fields have no field-level RowLabel slot; per-section labels are
// driven by each block's `admin.components.Label`. Inject a shared dynamic label
// (block type + first summary field) onto the layout blocks without mutating the
// shared block definitions used elsewhere.
const SECTION_ROW_LABEL = '@/src/payload/components/SectionRowLabel#SectionRowLabel';

const layoutBlocks = [
  Hero,
  FeaturedCollection,
  FeaturedProducts,
  RichText,
  ImageWithText,
  Gallery,
  Testimonials,
  LogoCloud,
  Newsletter,
  FAQ,
  PromoBanner,
  VideoEmbed,
  Divider,
  Recommendations,
  RecentlyViewed,
  Button,
  Text,
  SocialBar,
  Spacer,
  Columns,
  CallToAction,
  Stats,
  Quote,
  CardGrid,
  Banner,
  Steps,
  PricingTable,
  Countdown,
  Tabs,
  FeatureGrid,
  ProductShowcase,
  Reels,
].map((block) => ({
  ...block,
  fields: [...(block.fields ?? []), blockKeyField],
  admin: {
    ...block.admin,
    components: {
      ...block.admin?.components,
      Label: SECTION_ROW_LABEL,
    },
  },
}));

const autoSlugFromTitle: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data;

  const existingSlug = typeof originalDoc?.slug === 'string' ? originalDoc.slug.trim() : '';
  const providedSlug = typeof data.slug === 'string' ? data.slug.trim() : '';

  // Keep the stored slug on a plain update so a live builder URL never moves.
  if (shouldPreserveSlug({ operation, existingSlug, providedSlug })) {
    data.slug = existingSlug;
    return data;
  }

  const slug = await resolveCollectionSlug(req.payload, 'pages', {
    title: typeof data.title === 'string' ? data.title : undefined,
    slug: typeof data.slug === 'string' ? data.slug : undefined,
    excludeId: operation === 'update' ? originalDoc?.id : undefined,
  });

  if (slug) {
    data.slug = slug;
  }

  return data;
};

// Cache revalidation is scheduled to run after the HTTP response via next/server
// `after()`. When a page is written outside a request scope (CLI seed scripts, e.g.
// scripts/seed-home-page.ts), `after()` throws — and there is no live server cache to
// revalidate anyway, so the revalidation is safely skipped.
function revalidatePageAfterResponse(doc: { slug?: unknown }): void {
  const slug = typeof doc.slug === 'string' ? doc.slug : '';
  if (!slug) return;
  try {
    after(() => revalidatePageCache(slug));
  } catch {
    // Not in a request scope (e.g. a seed/CLI script) — nothing to revalidate.
  }
}

const afterChangeHook: CollectionAfterChangeHook = ({ doc }) => {
  revalidatePageAfterResponse(doc);
  return doc;
};

const afterDeleteHook: CollectionAfterDeleteHook = ({ doc }) => {
  revalidatePageAfterResponse(doc);
  return doc;
};

export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'updatedAt'],
    group: groups.content.name,
    description:
      'Click a page title to edit it in the visual builder. Use “+ New page” to start a blank page.',
    components: {
      beforeListTable: ['@/src/payload/components/NewPageButton#NewPageButton'],
      edit: {
        beforeDocumentControls: ['@/src/payload/components/OpenBuilderButton#OpenBuilderButton'],
      },
    },
  },
  access: payloadPublicReadAdminWrite,
  hooks: {
    beforeChange: [autoSlugFromTitle, capturePriorLayoutKeys],
    afterChange: [afterChangeHook, mirrorLocaleLayout],
    afterDelete: [afterDeleteHook],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
      admin: {
        components: {
          Cell: '@/src/payload/components/PageTitleCell#PageTitleCell',
        },
      },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description:
          'Auto-generated from the title when empty. Edit manually to customise the URL.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: {
        description:
          'Only published pages are visible on the storefront. Draft pages are visible only in the live preview.',
      },
    },
    {
      name: 'layout',
      type: 'blocks',
      localized: true,
      labels: { singular: 'Section', plural: 'Sections' },
      blocks: layoutBlocks,
      admin: {
        hidden: true,
        description: 'Edited in the visual builder.',
      },
    },
  ],
};