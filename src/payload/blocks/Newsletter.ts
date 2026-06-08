// src/payload/blocks/Newsletter.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Newsletter: Block = {
  slug: 'newsletter',
  labels: { singular: 'Newsletter', plural: 'Newsletters' },
  interfaceName: 'NewsletterBlock',
  imageURL: '/admin/block-previews/newsletter.svg',
  imageAltText: 'Newsletter preview',
  admin: {
    description: 'Email sign-up form with heading.',
  },
  fields: [
    {
      name: 'headline',
      type: 'text',
      required: true,
    },
    {
      name: 'subheadline',
      type: 'textarea',
    },
    {
      name: 'placeholder',
      type: 'text',
      defaultValue: 'Enter your email',
    },
    {
      name: 'buttonLabel',
      type: 'text',
      defaultValue: 'Subscribe',
    },
    {
      name: 'disclaimer',
      type: 'text',
    },
    ...appearanceFields,
  ],
};