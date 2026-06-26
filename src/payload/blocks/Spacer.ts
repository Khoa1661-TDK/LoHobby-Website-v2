// src/payload/blocks/Spacer.ts — vertical spacing block.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Spacer: Block = {
  slug: 'spacer',
  labels: { singular: 'Spacer', plural: 'Spacers' },
  interfaceName: 'SpacerBlock',
  imageURL: '/admin/block-previews/spacer.svg',
  imageAltText: 'Spacer preview',
  fields: [
    {
      name: 'height',
      type: 'select',
      defaultValue: 'md',
      options: [
        { label: 'Extra small', value: 'xs' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra large', value: 'xl' },
      ],
    },
    ...appearanceFields,
  ],
};
