// src/payload/blocks/PromoBanner.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';
import { linkFields } from './_link';

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
    },
    {
      name: 'ctaLabel',
      type: 'text',
    },
    {
      name: 'ctaHref',
      type: 'text',
    },
    // Optional link for the whole banner. Distinct from the inline CTA above so the
    // entire strip can be clickable even without a button.
    ...linkFields,
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
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional background image. Overrides the background color when set.',
      },
    },
    ...appearanceFields,
  ],
};