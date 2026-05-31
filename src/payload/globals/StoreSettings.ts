// src/payload/globals/StoreSettings.ts
import type { GlobalAfterChangeHook, GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { revalidateStoreSettingsCache } from '@/lib/store-settings';

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
      'Store identity, branding, contact details, and policy links for the storefront and SEO.',
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
          label: 'Identity',
          fields: [
            {
              name: 'storeName',
              type: 'text',
              label: 'Store name',
              admin: {
                placeholder: 'My Store',
                description: 'Overrides NEXT_PUBLIC_SITE_NAME when set.',
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
              name: 'footerTagline',
              type: 'text',
              label: 'Footer tagline',
            },
            {
              name: 'brandOrigin',
              type: 'text',
              label: 'Origin / badge line',
              admin: {
                description: 'Small uppercase line under the tagline (e.g. "Made in Vietnam").',
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
                    description: 'Optional. If empty, the main logo is used (may auto-invert).',
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
              type: 'row',
              fields: [
                {
                  name: 'primaryColor',
                  type: 'text',
                  label: 'Primary color',
                  defaultValue: '#000000',
                  admin: {
                    width: '50%',
                    placeholder: '#2563eb',
                    description: 'Hex color for buttons, links, and accents.',
                  },
                },
                {
                  name: 'accentColor',
                  type: 'text',
                  label: 'Accent color',
                  defaultValue: '#737373',
                  admin: {
                    width: '50%',
                    placeholder: '#f59e0b',
                  },
                },
              ],
            },
            {
              name: 'storeDescription',
              type: 'textarea',
              label: 'SEO description',
              admin: {
                description: 'Default meta description for the storefront.',
              },
            },
            {
              name: 'storeDescriptionShort',
              type: 'text',
              label: 'Short description',
              admin: {
                description: 'Used in PWA manifest, welcome toast, and compact UI.',
              },
            },
          ],
        },
        {
          label: 'Contact & policies',
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
              admin: {
                description: 'ISO 4217 code shown in checkout copy (amounts stay VND integers).',
              },
            },
            {
              name: 'checkoutNote',
              type: 'textarea',
              label: 'Checkout note',
              admin: {
                description: 'Optional message shown on the checkout page (e.g. processing times).',
              },
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
            {
              name: 'footerCredit',
              type: 'text',
              label: 'Footer credit line',
              admin: {
                description: 'Optional small print in the footer (e.g. developer credit).',
              },
            },
            {
              name: 'socialLinks',
              type: 'array',
              label: 'Social links',
              admin: {
                description: 'Shown in the footer. Leave empty to use env defaults.',
              },
              fields: [
                { name: 'label', type: 'text', required: true },
                { name: 'url', type: 'text', required: true },
              ],
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
              admin: {
                description: 'When enabled, VAT/sales tax is added at checkout based on the rate below.',
              },
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
                description:
                  'Applied to subtotal minus coupon discount (before shipping). Example: 10 = 10% VAT.',
              },
            },
          ],
        },
      ],
    },
  ],
};
