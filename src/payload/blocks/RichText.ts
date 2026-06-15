// src/payload/blocks/RichText.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const RichText: Block = {
  slug: 'richText',
  labels: { singular: 'Rich Text', plural: 'Rich Text' },
  interfaceName: 'RichTextBlock',
  imageURL: '/admin/block-previews/rich-text.svg',
  imageAltText: 'Rich text preview',
  fields: [
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'textAlign',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    ...appearanceFields,
  ],
};