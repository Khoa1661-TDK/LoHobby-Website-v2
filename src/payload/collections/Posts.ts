// src/payload/collections/Posts.ts — blog posts (Content)
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
} from 'payload';
import { after } from 'next/server';

import { payloadPublicReadAdminWrite } from '@/lib/payload-access';
import { revalidateBlogCache } from '@/lib/blog';
import { resolveCollectionSlug, slugifyVietnamese } from '@/lib/slugify';
import { groups } from '@/src/payload/groups';

const autoSlugFromTitle: CollectionBeforeChangeHook = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (!data) return data;

  const slug = await resolveCollectionSlug(req.payload, 'posts', {
    title: typeof data.title === 'string' ? data.title : undefined,
    slug: typeof data.slug === 'string' ? data.slug : undefined,
    excludeId: operation === 'update' ? originalDoc?.id : undefined,
  });

  if (slug) {
    data.slug = slug;
  }

  return data;
};

const invalidateBlogOnChange: CollectionAfterChangeHook = ({ doc }) => {
  after(() => {
    revalidateBlogCache();
  });
  return doc;
};

const invalidateBlogOnDelete: CollectionAfterDeleteHook = ({ doc }) => {
  after(() => {
    revalidateBlogCache();
  });
  return doc;
};

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  admin: {
    group: groups.content.name,
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'status', 'publishedAt', 'updatedAt'],
    description: 'Blog posts rendered on the storefront.',
  },
  access: payloadPublicReadAdminWrite,
  hooks: {
    beforeChange: [autoSlugFromTitle],
    afterChange: [invalidateBlogOnChange],
    afterDelete: [invalidateBlogOnDelete],
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
      name: 'excerpt',
      type: 'textarea',
      admin: {
        description: 'Short summary shown in post listings and meta tags.',
      },
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'body',
      type: 'richText',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'blog-categories',
    },
    {
      name: 'tags',
      type: 'array',
      labels: { singular: 'Tag', plural: 'Tags' },
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'tag',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        description:
          'Posts are only public once published AND this time has elapsed.',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      admin: { position: 'sidebar' },
    },
  ],
};
