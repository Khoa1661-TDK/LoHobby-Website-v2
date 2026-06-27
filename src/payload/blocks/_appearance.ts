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
      { label: 'Custom (px)', value: 'custom' },
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
  {
    name: 'maxWidthCustom',
    type: 'text',
    admin: {
      condition: (_, siblingData) => siblingData?.containerWidth === 'custom',
      description: 'Custom max content width in pixels, e.g. 720.',
      placeholder: '720',
    },
  },
  {
    name: 'contentAlign',
    type: 'select',
    defaultValue: 'left',
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Center', value: 'center' },
      { label: 'Right', value: 'right' },
    ],
    admin: { description: 'Horizontal alignment of the section content.' },
  },
  {
    name: 'rounded',
    type: 'select',
    defaultValue: 'none',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
      { label: 'Extra large', value: 'xl' },
    ],
    admin: { description: 'Corner radius for the section.' },
  },
  {
    name: 'border',
    type: 'checkbox',
    defaultValue: false,
    admin: { description: 'Show a thin border around the section.' },
  },
  {
    name: 'animate',
    type: 'select',
    defaultValue: 'none',
    options: [
      { label: 'None', value: 'none' },
      { label: 'Reveal up', value: 'reveal-up' },
      { label: 'Reveal from left', value: 'reveal-right' },
      { label: 'Scale in', value: 'scale-in' },
    ],
    admin: { description: 'Animation when the section scrolls into view.' },
  },
];