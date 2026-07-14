// src/payload/blocks/ReelCarousel.ts — horizontal, arrow-navigated carousel of
// short-form reels from YouTube / Facebook / TikTok. Each tile shows a poster and
// opens a play modal with the platform's embed (see components/blocks/ReelCarousel).
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const ReelCarousel: Block = {
  slug: 'reelCarousel',
  labels: { singular: 'Reel Carousel', plural: 'Reel Carousels' },
  interfaceName: 'ReelCarouselBlock',
  imageURL: '/admin/block-previews/reel-carousel.svg',
  imageAltText: 'Reel carousel preview',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text' },
    { name: 'followLabel', type: 'text' },
    { name: 'followHref', type: 'text' },
    {
      name: 'reels',
      type: 'array',
      maxRows: 24,
      labels: { singular: 'Reel', plural: 'Reels' },
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          defaultValue: 'youtube',
          options: [
            { label: 'YouTube', value: 'youtube' },
            { label: 'TikTok', value: 'tiktok' },
            { label: 'Facebook', value: 'facebook' },
          ],
        },
        {
          // Not `required`: the visual builder autosaves reels before they're filled in.
          // The render layer drops any reel without a url (see components/blocks/ReelCarousel.tsx).
          name: 'url',
          type: 'text',
          admin: {
            description: 'Reel/short/video URL (YouTube Shorts, TikTok, or Facebook video).',
            placeholder: 'https://www.youtube.com/shorts/…',
          },
        },
        { name: 'poster', type: 'upload', relationTo: 'media' },
        { name: 'caption', type: 'text' },
        { name: 'views', type: 'text', admin: { placeholder: 'e.g. 1.2M views' } },
      ],
    },
    ...appearanceFields,
  ],
};
