// src/payload/blocks/_appearance.ts — reusable appearance fields for all page-builder blocks
import type { Field } from 'payload';

export const appearanceFields: Field[] = [
  {
    name: 'background',
    type: 'select',
    defaultValue: 'theme',
    options: [
      { label: 'Theme (inherit)', value: 'theme' },
      { label: 'Light', value: 'light' },
      { label: 'Dark', value: 'dark' },
      { label: 'Custom color', value: 'custom' },
    ],
    admin: {
      description: 'Background mode for this section.',
    },
  },
  {
    name: 'backgroundCustom',
    type: 'text',
    admin: {
      condition: (_, siblingData) => siblingData?.background === 'custom',
      description: 'Hex color, e.g. #f5f0eb.',
      placeholder: '#f5f0eb',
    },
  },
  {
    name: 'backgroundCustomDark',
    type: 'text',
    admin: {
      condition: (_, siblingData) => siblingData?.background === 'custom',
      description: 'Dark-theme background hex. Leave empty to reuse the light color.',
      placeholder: '#14181d',
    },
  },
  {
    name: 'containerWidth',
    type: 'select',
    defaultValue: 'normal',
    options: [
      { label: 'Narrow (max-w-3xl)', value: 'narrow' },
      { label: 'Normal (max-w-screen-xl)', value: 'normal' },
      { label: 'Wide (max-w-screen-2xl)', value: 'wide' },
      { label: 'Full width', value: 'full' },
    ],
    admin: {
      description: 'Max content width for this section.',
    },
  },
  {
    name: 'paddingY',
    type: 'select',
    defaultValue: 'base',
    options: [
      { label: 'Compact (py-8)', value: 'compact' },
      { label: 'Base (py-16)', value: 'base' },
      { label: 'Spacious (py-24)', value: 'spacious' },
      { label: 'None', value: 'none' },
    ],
    admin: {
      description: 'Vertical padding for the section.',
    },
  },
];