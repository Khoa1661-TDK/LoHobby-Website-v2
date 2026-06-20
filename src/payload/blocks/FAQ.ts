// src/payload/blocks/FAQ.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const FAQ: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  interfaceName: 'FAQBlock',
  imageURL: '/admin/block-previews/faq.svg',
  imageAltText: 'FAQ preview',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'FAQ item', plural: 'FAQ items' },
      fields: [
        {
          name: 'question',
          type: 'text',
        },
        {
          name: 'answer',
          type: 'richText',
        },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'accordion',
      options: [
        { label: 'Accordion', value: 'accordion' },
        { label: 'Two-column', value: 'twoCol' },
      ],
    },
    ...appearanceFields,
  ],
};