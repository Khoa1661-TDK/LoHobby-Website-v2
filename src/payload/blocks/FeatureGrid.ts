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
        { name: 'title', type: 'text', required: true },
        { name: 'text', type: 'textarea' },
      ],
    },
    ...appearanceFields,
  ],
};
