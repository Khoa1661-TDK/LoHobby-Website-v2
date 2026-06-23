// src/payload/blocks/Banner.ts — thin full-width announcement strip.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Banner: Block = {
  slug: 'banner',
  labels: { singular: 'Banner', plural: 'Banners' },
  interfaceName: 'BannerBlock',
  fields: [
    { name: 'text', type: 'text', required: true },
    { name: 'linkLabel', type: 'text' },
    { name: 'url', type: 'text' },
    { name: 'openInNewTab', type: 'checkbox', label: 'Open in new tab', defaultValue: false },
    ...appearanceFields,
  ],
};
