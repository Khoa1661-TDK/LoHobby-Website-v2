// src/payload/blocks/CallToAction.ts — heading + subheading + up to two CTA buttons.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const CallToAction: Block = {
  slug: 'callToAction',
  labels: { singular: 'Call to Action', plural: 'Calls to Action' },
  interfaceName: 'CallToActionBlock',
  imageURL: '/admin/block-previews/call-to-action.svg',
  imageAltText: 'Call to action preview',
  fields: [
    { name: 'heading', type: 'text' },
    { name: 'subheading', type: 'textarea' },
    { name: 'primaryLabel', type: 'text' },
    { name: 'primaryUrl', type: 'text' },
    {
      name: 'primaryOpenInNewTab',
      type: 'checkbox',
      label: 'Open primary link in new tab',
      defaultValue: false,
    },
    { name: 'secondaryLabel', type: 'text' },
    { name: 'secondaryUrl', type: 'text' },
    {
      name: 'secondaryOpenInNewTab',
      type: 'checkbox',
      label: 'Open secondary link in new tab',
      defaultValue: false,
    },
    {
      name: 'align',
      type: 'select',
      defaultValue: 'center',
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
      ],
    },
    ...appearanceFields,
  ],
};
