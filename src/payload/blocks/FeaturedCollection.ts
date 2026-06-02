// src/payload/blocks/FeaturedCollection.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const FeaturedCollection: Block = {
  slug: 'featuredCollection',
  labels: { singular: 'Featured Collection', plural: 'Featured Collections' },
  interfaceName: 'FeaturedCollectionBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'collection',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      hasMany: false,
    },
    {
      name: 'limit',
      type: 'number',
      defaultValue: 8,
      min: 2,
      max: 24,
      admin: {
        description: 'Max number of products to show from this collection.',
      },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Carousel', value: 'carousel' },
      ],
    },
    ...appearanceFields,
  ],
};