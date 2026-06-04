// src/payload/globals/NotificationSettings.ts — admin-managed Zalo OA notification config
import type { GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';

export const NotificationSettings: GlobalConfig = {
  slug: 'notification-settings',
  label: 'Notification settings',
  admin: {
    description:
      'Zalo Official Account notifications sent to the seller when a new order is placed.',
    group: 'Settings',
  },
  access: {
    read: payloadAdminAccess,
    update: payloadAdminAccess,
  },
  fields: [
    {
      name: 'zaloEnabled',
      type: 'checkbox',
      label: 'Enable Zalo order notifications',
      defaultValue: false,
    },
    {
      name: 'zaloAppId',
      type: 'text',
      label: 'Zalo OA App ID',
      admin: { description: 'From the Zalo for Developers app dashboard.' },
    },
    {
      name: 'zaloAppSecret',
      type: 'text',
      label: 'Zalo OA App Secret',
    },
    {
      name: 'zaloRecipientUserId',
      type: 'text',
      label: "Seller's Zalo user ID",
      admin: {
        description: 'The user_id that has chatted with the OA and will receive messages.',
      },
    },
    {
      name: 'zaloRefreshToken',
      type: 'text',
      label: 'Zalo refresh token',
      admin: {
        description:
          'Paste the initial refresh token obtained from OA OAuth. Auto-rotated thereafter.',
      },
    },
    {
      name: 'zaloAccessToken',
      type: 'text',
      label: 'Zalo access token (managed)',
      admin: { readOnly: true, description: 'Set automatically; do not edit.' },
    },
    {
      name: 'zaloTokenExpiresAt',
      type: 'date',
      label: 'Access token expiry (managed)',
      admin: { readOnly: true },
    },
  ],
};
