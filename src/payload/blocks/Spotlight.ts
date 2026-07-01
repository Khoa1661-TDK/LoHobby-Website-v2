// src/payload/blocks/Spotlight.ts — split "deal of the week" banner with price + countdown.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Spotlight: Block = {
  slug: 'spotlight',
  labels: { singular: 'Spotlight Deal', plural: 'Spotlight Deals' },
  interfaceName: 'SpotlightBlock',
  fields: [
    {
      name: 'product',
      type: 'relationship',
      relationTo: 'products',
      admin: {
        description:
          'The featured product. Its image, price, and sale discount drive the banner — no need to re-upload media or retype prices.',
      },
    },
    { name: 'eyebrow', type: 'text' },
    {
      name: 'heading',
      type: 'text',
      admin: { description: 'Optional. Falls back to the product title when blank.' },
    },
    {
      name: 'description',
      type: 'textarea',
      admin: { description: 'Optional. Falls back to the product description when blank.' },
    },
    {
      name: 'discountLabel',
      type: 'text',
      admin: {
        description: 'Optional override, e.g. "-30%". Derived from the product sale price when blank.',
      },
    },
    {
      name: 'priceNow',
      type: 'text',
      admin: {
        description: 'Optional override, e.g. "₫1,290,000". Uses the product sale price when blank.',
      },
    },
    {
      name: 'priceWas',
      type: 'text',
      admin: {
        description: 'Optional override for the struck-through price. Uses the product compare-at price when blank.',
      },
    },
    { name: 'ctaLabel', type: 'text', admin: { description: 'Defaults to "Grab the deal".' } },
    {
      name: 'ctaHref',
      type: 'text',
      admin: { description: 'Optional override. Defaults to the product page (/product/{handle}).' },
    },
    {
      name: 'targetDate',
      type: 'text',
      admin: {
        description:
          'Optional countdown target in ISO 8601, e.g. 2026-12-31T23:59:59Z. Leave blank to hide the timer.',
      },
    },
    { name: 'expiredText', type: 'text', defaultValue: 'This deal has ended.' },
    ...appearanceFields,
  ],
};
