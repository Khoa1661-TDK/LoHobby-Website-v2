// src/payload/blocks/SocialBar.ts — a row of social-media icon links.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';
import { SOCIAL_PLATFORMS } from '@/lib/social-platforms';

export const SocialBar: Block = {
  slug: 'socialBar',
  labels: { singular: 'Social Bar', plural: 'Social Bars' },
  interfaceName: 'SocialBarBlock',
  imageURL: '/admin/block-previews/social-bar.svg',
  imageAltText: 'Social bar preview',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'items',
      type: 'array',
      labels: { singular: 'Profile', plural: 'Profiles' },
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          defaultValue: 'facebook',
          options: SOCIAL_PLATFORMS.map((p) => ({ label: p.label, value: p.value })),
        },
        {
          name: 'url',
          type: 'text',
          admin: {
            placeholder: 'https://… (or mailto: for email)',
            description: 'Required for the icon to render. Items without a URL are hidden.',
          },
        },
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
    {
      name: 'iconStyle',
      type: 'select',
      defaultValue: 'solid',
      options: [
        { label: 'Solid', value: 'solid' },
        { label: 'Outline', value: 'outline' },
      ],
    },
    {
      name: 'size',
      type: 'select',
      defaultValue: 'medium',
      options: [
        { label: 'Small', value: 'small' },
        { label: 'Medium', value: 'medium' },
        { label: 'Large', value: 'large' },
      ],
    },
    ...appearanceFields,
  ],
};
