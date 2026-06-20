// src/payload/blocks/ImageWithText.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const ImageWithText: Block = {
  slug: 'imageWithText',
  labels: { singular: 'Image with Text', plural: 'Image with Text' },
  interfaceName: 'ImageWithTextBlock',
  imageURL: '/admin/block-previews/image-with-text.svg',
  imageAltText: 'Image with text preview',
  fields: [
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'imagePosition',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
      ],
    },
    {
      name: 'headline',
      type: 'text',
    },
    {
      name: 'body',
      type: 'richText',
    },
    {
      name: 'ctaLabel',
      type: 'text',
    },
    {
      name: 'ctaHref',
      type: 'text',
    },
    {
      name: 'imageRatio',
      type: 'select',
      defaultValue: '1/1',
      options: [
        { label: 'Square (1:1)', value: '1/1' },
        { label: 'Landscape (4:3)', value: '4/3' },
        { label: 'Portrait (3:4)', value: '3/4' },
        { label: 'Wide (16:9)', value: '16/9' },
      ],
    },
    ...appearanceFields,
  ],
};