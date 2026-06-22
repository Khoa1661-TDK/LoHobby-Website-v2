// src/payload/blocks/_link.ts — reusable link fields for page-builder blocks.
// Mirrors the Navigation global's url + openInNewTab pattern so the editor's existing
// `text` + `checkbox` field renderers can drive it with no new field-renderer type.
import type { Field } from 'payload';

/** A plain URL + "open in new tab" pair. Works for internal (`/path`) and external
 *  (`https://…`) links. The render side derives `rel`/`target` from both the checkbox
 *  and whether the URL is absolute. */
export const linkFields: Field[] = [
  {
    name: 'url',
    type: 'text',
    admin: {
      placeholder: '/search or https://…',
      description: 'Use "/" for internal pages or "http(s)://" for external links.',
    },
  },
  {
    name: 'openInNewTab',
    type: 'checkbox',
    label: 'Open in new tab',
    defaultValue: false,
  },
];
