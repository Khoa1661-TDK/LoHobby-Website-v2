// src/payload/blocks/VideoEmbed.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const VideoEmbed: Block = {
  slug: 'videoEmbed',
  labels: { singular: 'Video Embed', plural: 'Video Embeds' },
  interfaceName: 'VideoEmbedBlock',
  imageURL: '/admin/block-previews/video-embed.svg',
  imageAltText: 'Video embed preview',
  fields: [
    {
      name: 'title',
      type: 'text',
    },
    {
      name: 'url',
      type: 'text',
      admin: {
        description: 'YouTube or Vimeo embed URL.',
        placeholder: 'https://www.youtube.com/embed/...',
      },
    },
    {
      name: 'aspectRatio',
      type: 'select',
      defaultValue: '16/9',
      options: [
        { label: '16:9', value: '16/9' },
        { label: '4:3', value: '4/3' },
        { label: '1:1', value: '1/1' },
      ],
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'Optional poster image before playback.',
      },
    },
    ...appearanceFields,
  ],
};