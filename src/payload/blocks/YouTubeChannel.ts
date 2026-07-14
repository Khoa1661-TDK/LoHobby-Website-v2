// src/payload/blocks/YouTubeChannel.ts — channel card that shows live subscriber /
// view / video counts pulled from the YouTube Data API (see lib/youtube-stats.ts).
// Manual fallback fields render when YOUTUBE_API_KEY is unset or the fetch fails.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const YouTubeChannel: Block = {
  slug: 'youtubeChannel',
  labels: { singular: 'YouTube Channel', plural: 'YouTube Channels' },
  interfaceName: 'YouTubeChannelBlock',
  imageURL: '/admin/block-previews/youtube-channel.svg',
  imageAltText: 'YouTube channel preview',
  fields: [
    { name: 'eyebrow', type: 'text' },
    { name: 'heading', type: 'text' },
    {
      name: 'channelIdentifier',
      type: 'text',
      admin: {
        description:
          'Channel ID (UC…), @handle, or full channel URL. Live counts require YOUTUBE_API_KEY. Leave blank to use only the manual fallback fields below.',
        placeholder: '@MrBeast',
      },
    },
    {
      name: 'channelUrl',
      type: 'text',
      admin: {
        description: 'Link for the Subscribe button. Falls back to the resolved channel page.',
        placeholder: 'https://www.youtube.com/@MrBeast',
      },
    },
    {
      name: 'subscribeLabel',
      type: 'text',
      admin: { placeholder: 'Subscribe' },
    },
    {
      name: 'showSubscribers',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Show subscriber count.' },
    },
    {
      name: 'showViews',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Show total view count.' },
    },
    {
      name: 'showVideos',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Show total video count.' },
    },
    {
      name: 'manualName',
      type: 'text',
      admin: {
        description: 'Fallback channel name when the API is unavailable.',
      },
    },
    {
      name: 'manualAvatar',
      type: 'upload',
      relationTo: 'media',
      admin: { description: 'Fallback avatar when the API is unavailable.' },
    },
    {
      name: 'manualSubscribers',
      type: 'text',
      admin: {
        description: 'Fallback subscriber count (e.g. "1.2M"). Used when the API is unavailable.',
      },
    },
    {
      name: 'manualViews',
      type: 'text',
      admin: {
        description: 'Fallback view count (e.g. "480M"). Used when the API is unavailable.',
      },
    },
    {
      name: 'manualVideos',
      type: 'text',
      admin: {
        description: 'Fallback video count (e.g. "742"). Used when the API is unavailable.',
      },
    },
    ...appearanceFields,
  ],
};
