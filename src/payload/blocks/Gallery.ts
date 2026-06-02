// src/payload/blocks/Gallery.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Gallery: Block = {
  slug: 'gallery',
  labels: { singular: 'Gallery', plural: 'Galleries' },
  interfaceName: 'GalleryBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'images',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Image', plural: 'Images' },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
        },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid (auto masonry)', value: 'grid' },
        { label: 'Row (horizontal scroll)', value: 'row' },
        { label: 'Bento (large hero + grid)', value: 'bento' },
      ],
    },
    ...appearanceFields,
  ],
};