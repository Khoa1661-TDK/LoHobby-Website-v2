// src/payload/blocks/Testimonials.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Testimonials: Block = {
  slug: 'testimonials',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
  interfaceName: 'TestimonialsBlock',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'entries',
      type: 'array',
      required: true,
      minRows: 1,
      labels: { singular: 'Testimonial', plural: 'Testimonials' },
      fields: [
        {
          name: 'quote',
          type: 'textarea',
          required: true,
        },
        {
          name: 'author',
          type: 'text',
          required: true,
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