// src/payload/blocks/FAQ.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const FAQ: Block = {
  slug: 'faq',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  interfaceName: 'FAQBlock',
  imageURL: '/admin/block-previews/faq.svg',
  imageAltText: 'FAQ preview',
  admin: {
    description: 'Expandable question-and-answer list.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'FAQ item', plural: 'FAQ items' },
      fields: [
        {
          name: 'question',
          type: 'text',
          required: true,
        },
        {
          name: 'answer',
          type: 'richText',
          required: true,
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