// src/payload/blocks/Button.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';
import { linkFields } from './_link';

export const Button: Block = {
  slug: 'button',
  labels: { singular: 'Button', plural: 'Buttons' },
  interfaceName: 'ButtonBlock',
  imageURL: '/admin/block-previews/button.svg',
  imageAltText: 'Button preview',
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    ...linkFields,
    {
      name: 'style',
      type: 'select',
      defaultValue: 'primary',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Outline', value: 'outline' },
        { label: 'Minimal', value: 'minimal' },
      ],
    },
    {
      name: 'align',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ],
    },
    ...appearanceFields,
  ],
};
