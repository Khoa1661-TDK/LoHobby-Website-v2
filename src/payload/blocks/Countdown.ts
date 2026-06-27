// src/payload/blocks/Countdown.ts — live countdown to a target date.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Countdown: Block = {
  slug: 'countdown',
  labels: { singular: 'Countdown Timer', plural: 'Countdown Timers' },
  interfaceName: 'CountdownBlock',
  fields: [
    { name: 'heading', type: 'text' },
    {
      name: 'targetDate',
      type: 'text',
      required: true,
      admin: { description: 'Target date/time in ISO 8601, e.g. 2026-12-31T23:59:59Z' },
    },
    { name: 'expiredText', type: 'text', defaultValue: 'This offer has ended.' },
    { name: 'ctaLabel', type: 'text' },
    { name: 'ctaHref', type: 'text' },
    ...appearanceFields,
  ],
};
