// src/payload/blocks/FeatureGrid.ts — icon + title + text feature grid.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';
import { FEATURE_ICON_OPTIONS } from '@/lib/page-builder/feature-icons';

export const FeatureGrid: Block = {
  slug: 'featureGrid',
  labels: { singular: 'Feature List', plural: 'Feature Lists' },
  interfaceName: 'FeatureGridBlock',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'subheading', type: 'textarea' },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'list',
      options: [
        { label: 'List (icon + text)', value: 'list' },
        { label: 'Cards (image tiles)', value: 'cards' },
      ],
      admin: { description: '"Cards" renders linked image tiles for a category grid look.' },
    },
    {
      name: 'columns',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '2', value: '2' },
        { label: '3', value: '3' },
        { label: '4', value: '4' },
      ],
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'icon', type: 'select', options: FEATURE_ICON_OPTIONS },
        { name: 'image', type: 'upload', relationTo: 'media', admin: { description: 'Image tile for "Cards", or a thumbnail in place of the icon for "List".' } },
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
        { name: 'caption', type: 'text', admin: { description: 'Small line under the title (e.g. item count).' } },
        { name: 'href', type: 'text', admin: { description: 'Optional link target for the item.' } },
      ],
    },
    ...appearanceFields,
  ],
};
