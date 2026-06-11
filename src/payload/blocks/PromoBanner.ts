// src/payload/blocks/PromoBanner.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const PromoBanner: Block = {
  slug: 'promoBanner',
  labels: { singular: 'Promo Banner', plural: 'Promo Banners' },
  interfaceName: 'PromoBannerBlock',
  imageURL: '/admin/block-previews/promo-banner.svg',
  imageAltText: 'Promo banner preview',
  fields: [
    {
      name: 'text',
      type: 'text',
      required: true,
    },
    {
      name: 'ctaLabel',
      type: 'text',
    },
    {
      name: 'ctaHref',
      type: 'text',
    },
    {
      name: 'dismissible',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'countdown',
      type: 'date',
      admin: {
        description: 'Optional expiry date for countdown display.',
      },
    },
    ...appearanceFields,
  ],
};