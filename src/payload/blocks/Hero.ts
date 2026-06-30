// src/payload/blocks/Hero.ts
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Hero: Block = {
  slug: 'hero',
  labels: { singular: 'Hero', plural: 'Heroes' },
  interfaceName: 'HeroBlock',
  imageURL: '/admin/block-previews/hero.svg',
  imageAltText: 'Hero section preview',
  fields: [
    {
      name: 'eyebrow',
      type: 'text',
      admin: { description: 'Small uppercase label above the headline.' },
    },
    {
      name: 'headline',
      type: 'text',
    },
    {
      name: 'subheadline',
      type: 'textarea',
    },
    {
      name: 'ctaLabel',
      type: 'text',
    },
    {
      name: 'ctaHref',
      type: 'text',
    },
    {
      name: 'ctaStyle',
      type: 'select',
      defaultValue: 'primary',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Outline', value: 'outline' },
        { label: 'Minimal', value: 'minimal' },
      ],
    },
    {
      name: 'secondaryCtaLabel',
      type: 'text',
      admin: { description: 'Optional second (ghost) call-to-action.' },
    },
    {
      name: 'secondaryCtaHref',
      type: 'text',
    },
    {
      name: 'stats',
      type: 'array',
      labels: { singular: 'Stat', plural: 'Stats' },
      admin: { description: 'Small value + label pairs shown beneath the CTAs.' },
      fields: [
        { name: 'value', type: 'text', required: true },
        { name: 'label', type: 'text', required: true },
      ],
    },
    {
      name: 'collage',
      type: 'array',
      labels: { singular: 'Collage image', plural: 'Collage images' },
      admin: {
        description:
          'Floating images shown on the media side (gently bob). Replaces the single image when provided.',
      },
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'alt', type: 'text' },
      ],
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'imagePosition',
      type: 'select',
      defaultValue: 'right',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Right', value: 'right' },
        { label: 'Background', value: 'background' },
        { label: 'None', value: 'none' },
      ],
    },
    {
      name: 'textAlign',
      type: 'select',
      defaultValue: 'left',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    ...appearanceFields,
  ],
};