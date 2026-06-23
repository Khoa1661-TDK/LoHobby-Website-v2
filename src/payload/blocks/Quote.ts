// src/payload/blocks/Quote.ts — large pull-quote with optional avatar + attribution.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Quote: Block = {
  slug: 'quote',
  labels: { singular: 'Quote', plural: 'Quotes' },
  interfaceName: 'QuoteBlock',
  fields: [
    { name: 'quote', type: 'textarea', required: true },
    { name: 'author', type: 'text' },
    { name: 'role', type: 'text' },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    ...appearanceFields,
  ],
};
