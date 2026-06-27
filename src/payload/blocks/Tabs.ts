// src/payload/blocks/Tabs.ts — tabbed panels or accordion (variant toggle).
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Tabs: Block = {
  slug: 'tabs',
  labels: { singular: 'Tabs / Accordion', plural: 'Tabs / Accordions' },
  interfaceName: 'TabsBlock',
  fields: [
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'tabs',
      options: [
        { label: 'Tabs', value: 'tabs' },
        { label: 'Accordion', value: 'accordion' },
      ],
    },
    { name: 'heading', type: 'text' },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'content', type: 'richText' },
      ],
    },
    ...appearanceFields,
  ],
};
