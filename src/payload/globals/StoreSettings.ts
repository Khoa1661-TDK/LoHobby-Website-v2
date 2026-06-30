// src/payload/globals/StoreSettings.ts
import type { GlobalAfterChangeHook, GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { revalidateStoreSettingsCache } from '@/lib/store-settings';
import { FONT_PRESET_VALUES, FONT_PRESETS } from '@/lib/store-fonts';

const invalidateOnChange: GlobalAfterChangeHook = ({ doc }) => {
  try {
    revalidateStoreSettingsCache();
  } catch (error) {
    console.error('[store-settings.afterChange] revalidate failed:', error);
  }
  return doc;
};

export const StoreSettings: GlobalConfig = {
  slug: 'store-settings',
  label: 'Store settings',
  admin: {
    description:
      'White-label storefront appearance: logo, colors, fonts, hero, footer, and social links.',
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: payloadAdminAccess,
  },
  hooks: {
    afterChange: [invalidateOnChange],
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Logo',
          fields: [
            {
              name: 'storeName',
              type: 'text',
              label: 'Store name',
              admin: {
                description: 'Used in navbar, SEO, and hero when no custom hero title is set.',
              },
            },
            {
              name: 'storeSubtitle',
              type: 'text',
              label: 'Store subtitle',
              admin: {
                description: 'Optional line shown under the logo on marketing pages.',
              },
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'logo',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Logo',
                  admin: { width: '33%' },
                },
                {
                  name: 'logoDark',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Logo (dark mode)',
                  admin: {
                    width: '33%',
                    description: 'Optional. Falls back to main logo with invert filter.',
                  },
                },
                {
                  name: 'favicon',
                  type: 'upload',
                  relationTo: 'media',
                  label: 'Favicon',
                  admin: { width: '33%' },
                },
              ],
            },
            {
              name: 'storeDescription',
              type: 'textarea',
              label: 'SEO description',
            },
            {
              name: 'storeDescriptionShort',
              type: 'text',
              label: 'Short description',
              admin: {
                description: 'PWA manifest, welcome toast, and compact UI.',
              },
            },
          ],
        },
        {
          label: 'Primary color',
          fields: [
            {
              name: 'primaryColor',
              type: 'text',
              label: 'Primary color',
              defaultValue: '#000000',
              admin: {
                placeholder: '#2563eb',
                description: 'Buttons, links, and primary accents (hex).',
              },
            },
          ],
        },
        {
          label: 'Secondary color',
          fields: [
            {
              name: 'secondaryColor',
              type: 'text',
              label: 'Secondary color',
              defaultValue: '#737373',
              admin: {
                placeholder: '#f59e0b',
                description: 'Secondary accents, badges, and highlights (hex).',
              },
            },
            {
              name: 'accentColor',
              type: 'text',
              admin: {
                hidden: true,
                description: 'Legacy field — use Secondary color instead.',
              },
            },
          ],
        },
        {
          label: 'Font',
          fields: [
            {
              name: 'fontPreset',
              type: 'select',
              label: 'Font pairing',
              defaultValue: 'inter',
              options: FONT_PRESET_VALUES.map((value) => ({
                label: FONT_PRESETS[value].label,
                value,
              })),
              admin: {
                description: 'Controls body and heading fonts across the storefront.',
              },
            },
          ],
        },
        {
          label: 'Hero banner',
          fields: [
            {
              name: 'heroEnabled',
              type: 'checkbox',
              label: 'Show homepage hero',
              defaultValue: true,
            },
            {
              name: 'heroEyebrow',
              type: 'text',
              label: 'Eyebrow text',
              admin: {
                description: 'Small label above the hero title (e.g. "New collection · Free shipping").',
              },
            },
            {
              name: 'heroTitle',
              type: 'text',
              label: 'Hero title',
              admin: {
                description: 'Leave empty to use the store name.',
              },
            },
            {
              name: 'heroSubtitle',
              type: 'textarea',
              label: 'Hero subtitle',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'heroCtaLabel',
                  type: 'text',
                  label: 'CTA button label',
                  admin: { width: '50%', placeholder: 'Shop now' },
                },
                {
                  name: 'heroCtaUrl',
                  type: 'text',
                  label: 'CTA button URL',
                  admin: { width: '50%', placeholder: '/search' },
                },
              ],
            },
            {
              name: 'heroImage',
              type: 'upload',
              relationTo: 'media',
              label: 'Hero background image',
              admin: {
                description: 'Optional wide banner image behind the hero text.',
              },
            },
            {
              name: 'heroShowCarousel',
              type: 'checkbox',
              label: 'Show product carousel',
              defaultValue: true,
            },
            {
              name: 'heroCarouselTitle',
              type: 'text',
              label: 'Carousel section title',
              defaultValue: 'New arrivals',
            },
          ],
        },
        {
          label: 'Footer',
          fields: [
            {
              name: 'footerTagline',
              type: 'text',
              label: 'Footer tagline',
            },
            {
              name: 'brandOrigin',
              type: 'text',
              label: 'Origin / badge line',
              admin: {
                description: 'Small uppercase line in the footer (e.g. "Made in Vietnam").',
              },
            },
            {
              name: 'footerDescription',
              type: 'textarea',
              label: 'Footer description',
              admin: {
                description: 'Short blurb in the footer about column. Falls back to short store description.',
              },
            },
            {
              name: 'footerCredit',
              type: 'text',
              label: 'Footer credit line',
              admin: {
                description: 'Optional small print at the bottom (e.g. agency credit).',
              },
            },
            {
              name: 'footerShowNewsletter',
              type: 'checkbox',
              label: 'Show newsletter signup',
              defaultValue: true,
            },
          ],
        },
        {
          label: 'Social links',
          fields: [
            {
              name: 'socialLinks',
              type: 'array',
              label: 'Social profiles',
              admin: {
                description: 'Shown as icon links in the footer. Leave empty to use env defaults.',
              },
              fields: [
                { name: 'label', type: 'text', required: true, label: 'Platform' },
                { name: 'url', type: 'text', required: true, label: 'URL' },
              ],
            },
          ],
        },
        {
          label: 'Contact & checkout',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'contactEmail',
                  type: 'email',
                  label: 'Contact email',
                  admin: { width: '50%' },
                },
                {
                  name: 'contactPhone',
                  type: 'text',
                  label: 'Contact phone',
                  admin: { width: '50%' },
                },
              ],
            },
            {
              name: 'contactAddress',
              type: 'textarea',
              label: 'Contact / business address',
            },
            {
              name: 'currencyCode',
              type: 'text',
              label: 'Currency code',
              defaultValue: 'VND',
            },
            {
              name: 'checkoutNote',
              type: 'textarea',
              label: 'Checkout note',
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'returnsPolicyUrl',
                  type: 'text',
                  label: 'Returns policy URL',
                  admin: { width: '50%' },
                },
                {
                  name: 'privacyPolicyUrl',
                  type: 'text',
                  label: 'Privacy policy URL',
                  admin: { width: '50%' },
                },
              ],
            },
          ],
        },
        {
          label: 'Live chat',
          fields: [
            {
              name: 'chatEnabled',
              type: 'checkbox',
              label: 'Enable live chat widget',
              defaultValue: false,
              admin: {
                description: 'Master switch for the floating Zalo / Messenger chat bubbles.',
              },
            },
            {
              name: 'zaloChatEnabled',
              type: 'checkbox',
              label: 'Show Zalo chat',
              defaultValue: false,
              admin: { condition: (_data, sibling) => Boolean(sibling?.chatEnabled) },
            },
            {
              name: 'zaloOaId',
              type: 'text',
              label: 'Zalo Official Account ID',
              admin: {
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.zaloChatEnabled),
                description: 'Found in Zalo OA Manager → Settings → OA info.',
              },
            },
            {
              name: 'zaloWelcomeMessage',
              type: 'text',
              label: 'Zalo welcome message',
              admin: {
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.zaloChatEnabled),
              },
            },
            {
              name: 'messengerChatEnabled',
              type: 'checkbox',
              label: 'Show Messenger chat',
              defaultValue: false,
              admin: { condition: (_data, sibling) => Boolean(sibling?.chatEnabled) },
            },
            {
              name: 'fbPageId',
              type: 'text',
              label: 'Facebook Page ID',
              admin: {
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.messengerChatEnabled),
                description:
                  'Required. You must also whitelist this site domain in the Facebook Page: Inbox → Chat Plugin → Whitelisted Domains, or the bubble will not appear.',
              },
            },
            {
              name: 'messengerThemeColor',
              type: 'text',
              label: 'Messenger accent color (hex)',
              admin: {
                placeholder: '#2563eb',
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.messengerChatEnabled),
              },
            },
            {
              name: 'messengerGreeting',
              type: 'text',
              label: 'Messenger greeting',
              admin: {
                condition: (_data, sibling) =>
                  Boolean(sibling?.chatEnabled && sibling?.messengerChatEnabled),
              },
            },
          ],
        },
        {
          label: 'Tax',
          fields: [
            {
              name: 'taxEnabled',
              type: 'checkbox',
              label: 'Enable tax calculation',
              defaultValue: false,
            },
            {
              name: 'taxRatePercent',
              type: 'number',
              label: 'Tax rate (%)',
              min: 0,
              max: 100,
              defaultValue: 10,
              admin: {
                step: 1,
                condition: (_data, sibling) => Boolean(sibling?.taxEnabled),
              },
            },
          ],
        },
      ],
    },
  ],
};
