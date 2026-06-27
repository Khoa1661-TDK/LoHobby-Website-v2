// src/payload/blocks/PricingTable.ts — tiered pricing cards.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const PricingTable: Block = {
  slug: 'pricingTable',
  labels: { singular: 'Pricing Table', plural: 'Pricing Tables' },
  interfaceName: 'PricingTableBlock',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'subheading', type: 'textarea' },
    {
      name: 'tiers',
      type: 'array',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'price', type: 'text', required: true },
        { name: 'period', type: 'text' },
        { name: 'description', type: 'textarea' },
        {
          name: 'features',
          type: 'array',
          fields: [{ name: 'text', type: 'text', required: true }],
        },
        { name: 'ctaLabel', type: 'text' },
        { name: 'ctaHref', type: 'text' },
        { name: 'highlighted', type: 'checkbox', defaultValue: false },
      ],
    },
    ...appearanceFields,
  ],
};
