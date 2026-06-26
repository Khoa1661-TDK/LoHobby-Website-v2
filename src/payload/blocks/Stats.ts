// src/payload/blocks/Stats.ts — row of big value + small label stats.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Stats: Block = {
  slug: 'stats',
  labels: { singular: 'Stats', plural: 'Stats' },
  interfaceName: 'StatsBlock',
  imageURL: '/admin/block-previews/stats.svg',
  imageAltText: 'Stats preview',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'value', type: 'text' },
        { name: 'label', type: 'text' },
      ],
    },
    ...appearanceFields,
  ],
};
