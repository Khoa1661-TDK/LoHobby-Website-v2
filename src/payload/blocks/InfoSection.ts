// src/payload/blocks/InfoSection.ts — footer-style info section: about blurb, contact,
// quick links, and social icons. A reusable, self-contained "bottom of page" block.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';
import { SOCIAL_PLATFORMS } from '@/lib/social-platforms';

export const InfoSection: Block = {
  slug: 'infoSection',
  labels: { singular: 'Info Section', plural: 'Info Sections' },
  interfaceName: 'InfoSectionBlock',
  fields: [
    { name: 'heading', type: 'text', admin: { description: 'Optional title shown above the about blurb.' } },
    { name: 'about', type: 'textarea', admin: { description: 'About-us blurb / store description.' } },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'heading', type: 'text', defaultValue: 'Contact', admin: { description: 'Column heading.' } },
        { name: 'address', type: 'text' },
        { name: 'phone', type: 'text' },
        { name: 'email', type: 'text' },
      ],
    },
    {
      name: 'links',
      type: 'array',
      labels: { singular: 'Quick Link', plural: 'Quick Links' },
      admin: { description: 'Quick links column (e.g. Shipping, Returns, FAQ, Privacy).' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'href', type: 'text', required: true, admin: { placeholder: '/faq' } },
      ],
    },
    { name: 'linksHeading', type: 'text', defaultValue: 'Quick Links', admin: { description: 'Heading for the quick links column.' } },
    {
      name: 'social',
      type: 'array',
      labels: { singular: 'Social Profile', plural: 'Social Profiles' },
      admin: { description: 'Social media icon links.' },
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
    ...appearanceFields,
  ],
};
