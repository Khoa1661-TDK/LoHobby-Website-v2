// src/payload/collections/Redirects.ts — admin-managed legacy URL redirects (Settings)
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
} from 'payload';
import { after } from 'next/server';

import { payloadAdminAccess } from '@/lib/payload-access';
import { normalizeRedirectPath, revalidateRedirectsCache } from '@/lib/redirects';
import { groups } from '@/src/payload/groups';

const invalidateRedirectsOnChange: CollectionAfterChangeHook = ({ doc }) => {
  after(() => {
    revalidateRedirectsCache();
  });
  return doc;
};

const invalidateRedirectsOnDelete: CollectionAfterDeleteHook = ({ doc }) => {
  after(() => {
    revalidateRedirectsCache();
  });
  return doc;
};

export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: 'Redirect', plural: 'Redirects' },
  admin: {
    group: groups.settings.name,
    useAsTitle: 'from',
    defaultColumns: ['from', 'to', 'type', 'enabled', 'updatedAt'],
    description:
      'Map legacy or retired paths to their new destination. Matched in middleware before authentication.',
  },
  // Redirect rules are administrative configuration — restrict every operation to
  // admins. The middleware/server reads via the Payload Local API, which bypasses
  // access control, so locking down `read` does not break redirect resolution.
  access: {
    read: payloadAdminAccess,
    create: payloadAdminAccess,
    update: payloadAdminAccess,
    delete: payloadAdminAccess,
  },
  hooks: {
    afterChange: [invalidateRedirectsOnChange],
    afterDelete: [invalidateRedirectsOnDelete],
  },
  fields: [
    {
      name: 'from',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      label: 'From (incoming path)',
      admin: {
        description:
          'The inbound path to match, e.g. /old-product. Normalized to a leading slash with no trailing slash on save.',
      },
      hooks: {
        // Normalize so stored values match the normalized inbound pathname the
        // middleware compares against (predictable, collision-free matching).
        beforeValidate: [
          ({ value }) =>
            typeof value === 'string' ? normalizeRedirectPath(value) : value,
        ],
      },
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      label: 'To (destination)',
      admin: {
        description: 'Destination path (/new-product) or absolute URL (https://…).',
      },
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: '301',
      options: [
        { label: '301 — Permanent', value: '301' },
        { label: '302 — Temporary', value: '302' },
      ],
      admin: {
        description: '301 is cached by browsers/search engines; 302 is not.',
      },
    },
    {
      name: 'enabled',
      type: 'checkbox',
      defaultValue: true,
      label: 'Enabled',
      admin: {
        description: 'Disabled rules are kept for reference but never applied.',
      },
    },
  ],
};
