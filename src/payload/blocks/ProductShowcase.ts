// src/payload/blocks/ProductShowcase.ts — curated products with client-side
// category tab filtering + sort.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const ProductShowcase: Block = {
  slug: 'productShowcase',
  labels: { singular: 'Product Showcase', plural: 'Product Showcases' },
  interfaceName: 'ProductShowcaseBlock',
  imageURL: '/admin/block-previews/featured-products.svg',
  imageAltText: 'Product showcase preview',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text' },
    { name: 'subheading', type: 'textarea' },
    {
      name: 'products',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      maxRows: 24,
    },
    {
      name: 'showTabs',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Show category tabs built from the selected products.',
      },
    },
    {
      name: 'showSort',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Show the price sort dropdown.' },
    },
    ...appearanceFields,
  ],
};
