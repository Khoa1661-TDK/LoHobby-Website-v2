// src/payload/blocks/Columns.ts — multi-column content block.
import type { Block } from 'payload';
import { appearanceFields } from './_appearance';

export const Columns: Block = {
  slug: 'columns',
  labels: { singular: 'Columns', plural: 'Columns' },
  interfaceName: 'ColumnsBlock',
  imageURL: '/admin/block-previews/columns.svg',
  imageAltText: 'Columns preview',
  fields: [
    {
      name: 'columnCount',
      type: 'select',
      defaultValue: '3',
      options: [
        { label: '2 columns', value: '2' },
        { label: '3 columns', value: '3' },
        { label: '4 columns', value: '4' },
      ],
    },
    {
      name: 'columns',
      type: 'array',
      fields: [
        { name: 'heading', type: 'text' },
        { name: 'body', type: 'textarea' },
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'url', type: 'text' },
        { name: 'openInNewTab', type: 'checkbox', label: 'Open in new tab', defaultValue: false },
      ],
    },
    ...appearanceFields,
  ],
};
