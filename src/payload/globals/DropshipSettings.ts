// src/payload/globals/DropshipSettings.ts
import type { GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { groups } from '@/src/payload/groups';

export const DropshipSettings: GlobalConfig = {
  slug: 'dropship-settings',
  label: 'Dropshipping',
  admin: {
    group: groups.settings.name,
    description: 'CJ / dropship stub — set ENABLE_DROPSHIPPING=true to activate runtime.',
  },
  access: {
    read: payloadAdminAccess,
    update: payloadAdminAccess,
  },
  fields: [
    {
      name: 'enabled',
      type: 'checkbox',
      label: 'Enable dropshipping module',
      defaultValue: false,
    },
    {
      name: 'provider',
      type: 'select',
      defaultValue: 'cj',
      options: [
        { label: 'CJ Dropshipping (stub)', value: 'cj' },
        { label: 'Manual fulfillment', value: 'manual' },
      ],
    },
    {
      name: 'apiKey',
      type: 'text',
      label: 'API key',
      admin: {
        description: 'Stored in CMS DB — prefer env vault in production.',
      },
    },
    {
      name: 'autoSubmitOnPaid',
      type: 'checkbox',
      label: 'Auto-submit to provider when order is PAID',
      defaultValue: false,
    },
    { name: 'note', type: 'textarea', label: 'Internal notes' },
  ],
};
