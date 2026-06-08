// src/payload/collections/Pages.ts — Shopify-style CMS page builder
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload';
import { after } from 'next/server';

import { routing } from '@/i18n/routing';
import { payloadPublicReadAdminWrite } from '@/lib/payload-access';
import { resolveCollectionSlug } from '@/lib/slugify';
import { revalidatePageCache } from '@/lib/page-builder';
import { groups } from '@/src/payload/groups';
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
} from '@/src/payload/blocks';

const autoSlugFromTitle: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data;

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

const afterChangeHook: CollectionAfterChangeHook = ({ doc }) => {
  after(() => {
    const slug = typeof doc.slug === 'string' ? doc.slug : '';
    if (slug) {
      revalidatePageCache(slug);
    }
  });
  return doc;
};

const afterDeleteHook: CollectionAfterDeleteHook = ({ doc }) => {
  after(() => {
    const slug = typeof doc.slug === 'string' ? doc.slug : '';
    if (slug) {
      revalidatePageCache(slug);
    }
  });
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
      'Build storefront pages by stacking sections. Use the live preview on the right to see your changes.',
    livePreview: {
      url: ({ data }) => {
        const slug = typeof data?.slug === 'string' ? data.slug.trim() : '';
        if (!slug) return '';
        const base =
          process.env.NEXT_PUBLIC_APP_URL ??
          process.env.NEXT_PUBLIC_SITE_URL ??
          'http://localhost:3000';
        const secret = process.env.PREVIEW_SECRET ?? '';
        const path = `/${routing.defaultLocale}/pages/${slug}`;
        return `${base}/api/preview?secret=${encodeURIComponent(secret)}&path=${encodeURIComponent(path)}`;
      },
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
    },
  },
  access: payloadPublicReadAdminWrite,
  hooks: {
    beforeChange: [autoSlugFromTitle],
    afterChange: [afterChangeHook],
    afterDelete: [afterDeleteHook],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
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
      labels: { singular: 'Section', plural: 'Sections' },
      admin: {
        components: {
          RowLabel: '@/src/payload/components/SectionRowLabel#SectionRowLabel',
        },
      },
      blocks: [
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
      ],
    },
  ],
};