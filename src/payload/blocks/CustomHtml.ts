// src/payload/blocks/CustomHtml.ts — raw HTML escape hatch for designs the block set
// cannot express. Markup is sanitized at render (components/blocks/CustomHtml.tsx);
// nothing here is trusted.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const CustomHtml: Block = {
  slug: 'customHtml',
  labels: { singular: 'Custom HTML', plural: 'Custom HTML' },
  interfaceName: 'CustomHtmlBlock',
  fields: [
    {
      name: 'label',
      type: 'text',
      admin: { description: 'Editor-only name for this section, shown in the layers list.' },
    },
    {
      name: 'html',
      type: 'code',
      required: true,
      localized: true,
      admin: {
        language: 'html',
        description:
          'Markup for this section. Scripts, iframes, forms and event handlers are removed when the page renders.',
      },
    },
    {
      name: 'css',
      type: 'code',
      admin: {
        language: 'css',
        description:
          'Optional CSS. Every selector is automatically scoped to this section, so a rule here cannot affect the rest of the page. Not localized — styling is shared across languages.',
      },
    },
    ...appearanceFields,
  ],
};
