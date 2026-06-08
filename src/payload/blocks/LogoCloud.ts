// src/payload/blocks/LogoCloud.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const LogoCloud: Block = {
  slug: 'logoCloud',
  labels: { singular: 'Logo Cloud', plural: 'Logo Clouds' },
  interfaceName: 'LogoCloudBlock',
  imageURL: '/admin/block-previews/logo-cloud.svg',
  imageAltText: 'Logo cloud preview',
  admin: {
    description: 'Row of partner or brand logos.',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'logos',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Logo', plural: 'Logos' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'alt',
          type: 'text',
          required: true,
        },
        {
          name: 'href',
          type: 'text',
        },
      ],
    },
    {
      name: 'animate',
      type: 'checkbox',
      defaultValue: false,
      label: 'Auto-scroll marquee',
    },
    ...appearanceFields,
  ],
};