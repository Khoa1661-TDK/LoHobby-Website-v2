// src/payload/blocks/Marquee.ts — horizontally scrolling text strip.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Marquee: Block = {
  slug: 'marquee',
  labels: { singular: 'Marquee Strip', plural: 'Marquee Strips' },
  interfaceName: 'MarqueeBlock',
  fields: [
    {
      name: 'items',
      type: 'array',
      minRows: 1,
      maxRows: 24,
      admin: { description: 'Short phrases that scroll across the strip.' },
      fields: [{ name: 'text', type: 'text', required: true }],
    },
    {
      name: 'speed',
      type: 'select',
      defaultValue: 'normal',
      options: [
        { label: 'Slow', value: 'slow' },
        { label: 'Normal', value: 'normal' },
        { label: 'Fast', value: 'fast' },
      ],
      admin: { description: 'How fast the strip scrolls.' },
    },
    {
      name: 'direction',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
    },
    ...appearanceFields,
  ],
};
