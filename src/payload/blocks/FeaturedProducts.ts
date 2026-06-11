// src/payload/blocks/FeaturedProducts.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const FeaturedProducts: Block = {
  slug: 'featuredProducts',
  labels: { singular: 'Featured Products', plural: 'Featured Products' },
  interfaceName: 'FeaturedProductsBlock',
  imageURL: '/admin/block-previews/featured-products.svg',
  imageAltText: 'Featured products preview',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      required: true,
      hasMany: true,
      minRows: 1,
      maxRows: 12,
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