// src/payload/blocks/Divider.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Divider: Block = {
  slug: 'divider',
  labels: { singular: 'Divider', plural: 'Dividers' },
  interfaceName: 'DividerBlock',
  fields: [
    {
      name: 'style',
      type: 'select',
      defaultValue: 'line',
      options: [
        { label: 'Line', value: 'line' },
        { label: 'Dashed', value: 'dashed' },
        { label: 'Space (gap only)', value: 'space' },
        { label: 'Gradient', value: 'gradient' },
      ],
    },
    {
      name: 'showIcon',
      type: 'checkbox',
      defaultValue: false,
    },
    ...appearanceFields,
  ],
};