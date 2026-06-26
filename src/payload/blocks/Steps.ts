// src/payload/blocks/Steps.ts — numbered how-it-works steps.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Steps: Block = {
  slug: 'steps',
  labels: { singular: 'Steps', plural: 'Steps' },
  interfaceName: 'StepsBlock',
  imageURL: '/admin/block-previews/steps.svg',
  imageAltText: 'Steps preview',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'steps',
      type: 'array',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'body', type: 'textarea' },
      ],
    },
    ...appearanceFields,
  ],
};
