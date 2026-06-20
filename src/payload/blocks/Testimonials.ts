// src/payload/blocks/Testimonials.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Testimonials: Block = {
  slug: 'testimonials',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
  interfaceName: 'TestimonialsBlock',
  imageURL: '/admin/block-previews/testimonials.svg',
  imageAltText: 'Testimonials preview',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'entries',
      type: 'array',
      labels: { singular: 'Testimonial', plural: 'Testimonials' },
      fields: [
        {
          name: 'quote',
          type: 'textarea',
        },
        {
          name: 'author',
          type: 'text',
        },
        {
          name: 'role',
          type: 'text',
        },
        {
          name: 'avatar',
          type: 'upload',
          relationTo: 'media',
        },
        {
          name: 'rating',
          type: 'number',
          min: 1,
          max: 5,
        },
      ],
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'grid',
      options: [
        { label: 'Grid', value: 'grid' },
        { label: 'Single with controls', value: 'single' },
      ],
    },
    ...appearanceFields,
  ],
};