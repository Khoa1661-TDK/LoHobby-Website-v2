// src/payload/blocks/Recommendations.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Recommendations: Block = {
  slug: 'recommendations',
  labels: { singular: 'Personalized recommendations', plural: 'Personalized recommendations' },
  interfaceName: 'RecommendationsBlock',
  imageURL: '/admin/block-previews/recommendations.svg',
  imageAltText: 'Personalized recommendations preview',
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Recommended for you' },
    { name: 'limit', type: 'number', defaultValue: 8 },
    {
      name: 'products',
      label: 'Pinned products — overrides the auto list when set',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      maxRows: 12,
    },
    ...appearanceFields,
  ],
};