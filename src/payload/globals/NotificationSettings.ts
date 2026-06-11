// src/payload/globals/NotificationSettings.ts — admin-managed Discord order notifications
import type { GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';

export const NotificationSettings: GlobalConfig = {
  slug: 'notification-settings',
  label: 'Notification settings',
  admin: {
    description:
      'Discord notifications sent to the seller when a new order is placed. The seller can confirm the order from Discord.',
    group: 'Settings',
  },
  access: {
    read: payloadAdminAccess,
    update: payloadAdminAccess,
  },
  fields: [
    {
      name: 'discordEnabled',
      type: 'checkbox',
      label: 'Enable Discord order notifications',
      defaultValue: false,
    },
    {
      name: 'discordBotToken',
      type: 'text',
      label: 'Discord bot token',
      admin: { description: 'From the Discord Developer Portal → your app → Bot.' },
    },
    {
      name: 'discordChannelId',
      type: 'text',
      label: 'Discord channel ID',
      admin: { description: 'The channel the bot posts new-order notifications to.' },
    },
    {
      name: 'discordPublicKey',
      type: 'text',
      label: 'Discord application public key',
      admin: {
        description: 'From the app General Information page. Used to verify button presses.',
      },
    },
    {
      name: 'discordAllowedUserIds',
      type: 'text',
      label: 'Allowed Discord user IDs',
      admin: {
        description: 'Comma-separated Discord user IDs permitted to confirm orders.',
      },
    },
  ],
};
