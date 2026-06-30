// src/payload/blocks/Reels.ts — short-form video reels grid with a play modal.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Reels: Block = {
  slug: 'reels',
  labels: { singular: 'Reels', plural: 'Reels' },
  interfaceName: 'ReelsBlock',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text' },
    { name: 'followLabel', type: 'text' },
    { name: 'followHref', type: 'text' },
    {
      name: 'tiles',
      type: 'array',
      maxRows: 12,
      fields: [
        { name: 'poster', type: 'upload', relationTo: 'media' },
        { name: 'tag', type: 'text' },
        { name: 'caption', type: 'text' },
        { name: 'views', type: 'text' },
        {
          name: 'embedUrl',
          type: 'text',
          admin: {
            description:
              'Optional video URL (YouTube/TikTok/MP4). Leave blank to show the poster only.',
          },
        },
      ],
    },
    ...appearanceFields,
  ],
};
