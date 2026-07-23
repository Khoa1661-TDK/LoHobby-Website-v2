// src/payload/globals/StoreSettings.ts
import type { Field, GlobalAfterChangeHook, GlobalConfig } from 'payload';
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

// Flat field groups shared with the visual Site editor (/build/header). Exported so
// describeFieldsAsSchema can drive the page-builder FieldRenderer from these exact
// definitions (single source of truth). Kept FLAT — describeField does not recurse
// `row`, so the admin tabs below wrap subsets in rows for layout instead.
export const brandingIdentityFields: Field[] = [
  {
    name: 'storeName',
    type: 'text',
    label: 'Store name',
    admin: {
      hidden: true,
      description: 'Used in navbar, SEO, and hero when no custom hero title is set.',
    },
  },
  {
    name: 'storeSubtitle',
    type: 'text',
    label: 'Store subtitle',
    admin: {
      hidden: true,
      description: 'Optional line shown under the logo on marketing pages.',
    },
  },
  { name: 'logo', type: 'upload', relationTo: 'media', label: 'Logo', admin: { hidden: true } },
  {
    name: 'logoDark',
    type: 'upload',
    relationTo: 'media',
    label: 'Logo (dark mode)',
    admin: { hidden: true, description: 'Optional. Falls back to main logo with invert filter.' },
  },
  { name: 'favicon', type: 'upload', relationTo: 'media', label: 'Favicon', admin: { hidden: true } },
  {
    name: 'storeDescription',
    type: 'textarea',
    label: 'SEO description',
    admin: { hidden: true },
  },
  {
    name: 'storeDescriptionShort',
    type: 'text',
    label: 'Short description',
    admin: { hidden: true, description: 'PWA manifest, welcome toast, and compact UI.' },
  },
];

export const footerContentFields: Field[] = [
  { name: 'footerTagline', type: 'text', label: 'Footer tagline', admin: { hidden: true } },
  {
    name: 'brandOrigin',
    type: 'text',
    label: 'Origin / badge line',
    admin: { hidden: true, description: 'Small uppercase line in the footer (e.g. "Made in Vietnam").' },
  },
  {
    name: 'footerDescription',
    type: 'textarea',
    label: 'Footer description',
    admin: {
      hidden: true,
      description: 'Short blurb in the footer about column. Falls back to short store description.',
    },
  },
  {
    name: 'footerCredit',
    type: 'text',
    label: 'Footer credit line',
    admin: { hidden: true, description: 'Optional small print at the bottom (e.g. agency credit).' },
  },
  {
    name: 'footerShowNewsletter',
    type: 'checkbox',
    label: 'Show newsletter signup',
    defaultValue: true,
    admin: { hidden: true },
  },
  {
    name: 'contactEmail',
    type: 'email',
    label: 'Contact email',
    admin: { hidden: true },
  },
  {
    name: 'contactPhone',
    type: 'text',
    label: 'Contact phone',
    admin: { hidden: true },
  },
  {
    name: 'contactAddress',
    type: 'textarea',
    label: 'Contact / business address',
    admin: { hidden: true },
  },
  {
    name: 'socialLinks',
    type: 'array',
    label: 'Social profiles',
    admin: { hidden: true, description: 'Shown as icon links in the footer.' },
    fields: [
      { name: 'label', type: 'text', required: true, label: 'Platform' },
      { name: 'url', type: 'text', required: true, label: 'URL' },
    ],
  },
];

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
          description: 'Store name, logo, favicon, and SEO text are edited in the visual Site editor (Build → Header → Branding).',
          fields: [
            brandingIdentityFields[0]!, // storeName
            brandingIdentityFields[1]!, // storeSubtitle
            {
              type: 'row',
              fields: [
                { ...brandingIdentityFields[2]!, admin: { ...brandingIdentityFields[2]!.admin, width: '33%' } } as Field,
                { ...brandingIdentityFields[3]!, admin: { ...brandingIdentityFields[3]!.admin, width: '33%' } } as Field,
                { ...brandingIdentityFields[4]!, admin: { ...brandingIdentityFields[4]!.admin, width: '33%' } } as Field,
              ],
            },
            brandingIdentityFields[5]!, // storeDescription
            brandingIdentityFields[6]!, // storeDescriptionShort
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
          description: 'Footer text is edited in the visual Site editor (Build → Header → Footer).',
          fields: footerContentFields.slice(0, 5),
        },
        {
          label: 'Social links',
          description: 'Social profiles are edited in the visual Site editor (Build → Header → Footer).',
          fields: [footerContentFields[8]!], // socialLinks
        },
        {
          label: 'Contact & checkout',
          description: 'Email, phone, and address are edited in the visual Site editor (Build → Header → Footer); other fields remain here.',
          fields: [
            {
              type: 'row',
              fields: [
                { ...footerContentFields[5]!, admin: { ...footerContentFields[5]!.admin, width: '50%' } } as Field, // contactEmail
                { ...footerContentFields[6]!, admin: { ...footerContentFields[6]!.admin, width: '50%' } } as Field, // contactPhone
              ],
            },
            footerContentFields[7]!, // contactAddress
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
