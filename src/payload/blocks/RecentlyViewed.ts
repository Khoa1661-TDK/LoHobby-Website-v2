// src/payload/blocks/RecentlyViewed.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const RecentlyViewed: Block = {
  slug: 'recentlyViewed',
  labels: { singular: 'Recently viewed', plural: 'Recently viewed' },
  interfaceName: 'RecentlyViewedBlock',
  imageURL: '/admin/block-previews/recently-viewed.svg',
  imageAltText: 'Recently viewed preview',
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Recently viewed' },
    { name: 'limit', type: 'number', defaultValue: 8 },
    {
      name: 'products',
      label: 'Pinned products — overrides the auto list when set',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      maxRows: 12,
    },
    ...appearanceFields,
  ],
};