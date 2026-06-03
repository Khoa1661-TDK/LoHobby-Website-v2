// src/payload/globals/Navigation.ts
import type { GlobalAfterChangeHook, GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { revalidateNavigationCache } from '@/lib/navigation';

const invalidateNavigationOnChange: GlobalAfterChangeHook = ({ doc }) => {
  try {
    revalidateNavigationCache();
  } catch (error) {
    console.error('[navigation.afterChange] revalidate failed:', error);
  }
  return doc;
};

/**
 * Reusable "column of links" field — a text heading plus a repeatable list of
 * `{ label, url, openInNewTab }`. Shared by the footer and mobile menus so both
 * stay structurally identical and can be rendered by the same resolver.
 */
function columnMenuField(name: string, label: string, description: string) {
  return {
    name,
    type: 'array' as const,
    label,
    labels: { singular: 'Column', plural: 'Columns' },
    admin: {
      description,
      initCollapsed: true,
    },
    fields: [
      {
        name: 'heading',
        type: 'text' as const,
        required: true,
        admin: {
          placeholder: 'e.g. Hỗ trợ',
          description: 'Column heading shown above the links.',
        },
      },
      {
        name: 'links',
        type: 'array' as const,
        label: 'Links',
        labels: { singular: 'Link', plural: 'Links' },
        admin: {
          initCollapsed: true,
        },
        fields: [
          {
            name: 'label',
            type: 'text' as const,
            required: true,
            admin: {
              placeholder: 'e.g. Liên hệ',
            },
          },
          {
            name: 'url',
            type: 'text' as const,
            required: true,
            admin: {
              placeholder: '/contact or https://…',
              description: 'Use "/" for internal pages or "http(s)://" for external links.',
            },
          },
          {
            name: 'openInNewTab',
            type: 'checkbox' as const,
            label: 'Open in new tab',
            defaultValue: false,
          },
        ],
      },
    ],
  };
}

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  label: 'Navigation',
  admin: {
    description:
      'Configure the footer and mobile-menu link columns. Each column has a heading and a list of links. These are independent of the main site header — leave empty to fall back to the built-in defaults.',
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: payloadAdminAccess,
  },
  hooks: {
    afterChange: [invalidateNavigationOnChange],
  },
  fields: [
    columnMenuField(
      'footerMenu',
      'Footer menu',
      'Link columns rendered in the storefront footer (e.g. Support, Policies).',
    ),
    columnMenuField(
      'mobileMenu',
      'Mobile menu',
      'Link columns rendered in the slide-out mobile navigation drawer.',
    ),
  ],
};
