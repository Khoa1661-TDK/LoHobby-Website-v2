// src/payload/blocks/Recommendations.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Recommendations: Block = {
  slug: 'recommendations',
  labels: { singular: 'Personalized recommendations', plural: 'Personalized recommendations' },
  interfaceName: 'RecommendationsBlock',
  imageURL: '/admin/block-previews/featured-products.svg',
  imageAltText: 'Personalized recommendations preview',
  fields: [
    { name: 'title', type: 'text', defaultValue: 'Recommended for you' },
    { name: 'limit', type: 'number', defaultValue: 8 },
    ...appearanceFields,
  ],
};