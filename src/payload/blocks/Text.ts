// src/payload/blocks/Text.ts — plain-text block (heading + body). Distinct from RichText,
// which is a Lexical block; this one is fully editable in the custom builder panel today.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';
import { linkFields } from './_link';

export const Text: Block = {
  slug: 'text',
  labels: { singular: 'Text', plural: 'Text blocks' },
  interfaceName: 'TextBlock',
  imageURL: '/admin/block-previews/text.svg',
  imageAltText: 'Text preview',
  fields: [
    {
      name: 'heading',
      type: 'text',
    },
    {
      name: 'body',
      type: 'textarea',
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
    {
      name: 'size',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Normal', value: 'normal' },
        { label: 'Large', value: 'large' },
      ],
    },
    // Optional whole-block link. Safe because the Text block contains no inner links.
    ...linkFields,
    ...appearanceFields,
  ],
};
