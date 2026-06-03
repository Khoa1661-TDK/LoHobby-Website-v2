// src/payload/collections/BlogCategories.ts — blog taxonomy (Content)
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
} from 'payload';
import { after } from 'next/server';

import { payloadPublicReadAdminWrite } from '@/lib/payload-access';
import { revalidateBlogCache } from '@/lib/blog';
import { slugifyVietnamese } from '@/lib/slugify';
import { groups } from '@/src/payload/groups';

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

export const BlogCategories: CollectionConfig = {
  slug: 'blog-categories',
  labels: { singular: 'Blog category', plural: 'Blog categories' },
  admin: {
    group: groups.content.name,
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
    description: 'Topics used to organise blog posts.',
  },
  access: payloadPublicReadAdminWrite,
  hooks: {
    afterChange: [invalidateBlogOnChange],
    afterDelete: [invalidateBlogOnDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          'URL-safe identifier. Edit manually — saving normalizes it to a slug.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            const source =
              typeof value === 'string' && value.trim()
                ? value
                : typeof data?.name === 'string'
                  ? data.name
                  : '';
            return source ? slugifyVietnamese(source) : value;
          },
        ],
      },
    },
    {
      name: 'description',
      type: 'textarea',
    },
  ],
};
