// src/payload/globals/AutoSaleSettings.ts
import type { GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { groups } from '@/src/payload/groups';

export const AutoSaleSettings: GlobalConfig = {
  slug: 'auto-sale-settings',
  label: 'Automatic sale',
  admin: {
    description:
      'A nightly job puts the 5 most-viewed products of the last 7 days on a 10% sale, and removes them when they drop off. Sales you set by hand are never touched.',
    group: groups.settings.name,
  },
  access: {
    read: () => true,
    update: payloadAdminAccess,
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      label: 'Run the automatic sale',
      defaultValue: true,
      admin: {
        description: 'Unticking stops the job. Products already on auto-sale stay as they are.',
      },
    },
    {
      name: 'excludedProducts',
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
      label: 'Never auto-discount',
      admin: {
        description: 'Protected or low-margin products the job must skip, however popular they get.',
      },
    },
    {
      name: 'lastRun',
      type: 'group',
      label: 'Last run',
      admin: {
        description: 'Written by the job. Read-only.',
      },
      fields: [
        { name: 'ranAt', type: 'text', label: 'Ran at', admin: { readOnly: true } },
        { name: 'enabledCount', type: 'number', label: 'Put on sale', admin: { readOnly: true } },
        { name: 'disabledCount', type: 'number', label: 'Taken off sale', admin: { readOnly: true } },
        { name: 'skippedCount', type: 'number', label: 'Skipped', admin: { readOnly: true } },
        { name: 'errorCount', type: 'number', label: 'Failed updates', admin: { readOnly: true } },
        { name: 'enabledProducts', type: 'text', label: 'Put on sale', admin: { readOnly: true } },
        { name: 'disabledProducts', type: 'text', label: 'Taken off sale', admin: { readOnly: true } },
        { name: 'error', type: 'text', label: 'Error', admin: { readOnly: true } },
      ],
    },
  ],
};
