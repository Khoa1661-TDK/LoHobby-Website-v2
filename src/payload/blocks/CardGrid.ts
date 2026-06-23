// src/payload/blocks/CardGrid.ts — responsive grid of image/title/body cards.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const CardGrid: Block = {
  slug: 'cardGrid',
  labels: { singular: 'Card Grid', plural: 'Card Grids' },
  interfaceName: 'CardGridBlock',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'columnCount',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '2 columns', value: '2' },
        { label: '3 columns', value: '3' },
        { label: '4 columns', value: '4' },
      ],
    },
    {
      name: 'cards',
      type: 'array',
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'title', type: 'text' },
        { name: 'body', type: 'textarea' },
        { name: 'url', type: 'text' },
        { name: 'openInNewTab', type: 'checkbox', label: 'Open in new tab', defaultValue: false },
      ],
    },
    ...appearanceFields,
  ],
};
