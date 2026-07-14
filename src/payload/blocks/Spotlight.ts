// src/payload/blocks/Spotlight.ts — auto-advancing "deal" carousel. Each deal is a
// split banner embedding a real product (image/price/discount derived from it); the
// carousel rotates through them with dots + arrows and an editor-configurable timer.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Spotlight: Block = {
  slug: 'spotlight',
  labels: { singular: 'Spotlight Deal', plural: 'Spotlight Deals' },
  interfaceName: 'SpotlightBlock',
  fields: [
    { name: 'eyebrow', type: 'text', admin: { description: 'Shared label above every deal, e.g. "Deal of the week".' } },
    {
      name: 'deals',
      type: 'array',
      minRows: 1,
      maxRows: 12,
      labels: { singular: 'Deal', plural: 'Deals' },
      admin: {
        description:
          'Each deal is one slide. The carousel auto-advances through them and the shopper can also click the dots or arrows to switch.',
      },
      fields: [
        {
          name: 'product',
          type: 'relationship',
          relationTo: 'products',
          admin: {
            description:
              'The featured product. Its image, price, and sale discount drive the slide — no need to re-upload media or retype prices.',
          },
        },
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
            description: 'The discounted deal price, e.g. "₫899,000". Leave blank to use the product price as-is.',
          },
        },
        {
          name: 'priceWas',
          type: 'text',
          // The visual page builder auto-fills this box with the selected product's real
          // list price (see FieldRenderer), so the editor can see the original price and
          // type the discounted "priceNow" without looking it up. Purely a builder-side
          // authoring aid — the storefront still treats a blank value as "derive it".
          custom: { autoFillPriceFrom: 'product' },
          admin: {
            description:
              'Auto-fills with the selected product\'s price. Edit it to override, or clear it to re-fill from the product.',
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
      ],
    },
    {
      name: 'autoplay',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Automatically rotate to the next deal. Ignored when there is only one deal.' },
    },
    {
      name: 'autoplaySeconds',
      type: 'number',
      defaultValue: 6,
      min: 2,
      max: 30,
      admin: {
        condition: (_, siblingData) => siblingData?.autoplay !== false,
        description: 'Seconds each deal stays on screen before auto-advancing (2–30).',
      },
    },
    ...appearanceFields,
  ],
};
