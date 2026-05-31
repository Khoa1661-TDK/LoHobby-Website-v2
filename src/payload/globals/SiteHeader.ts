// src/payload/globals/SiteHeader.ts
import type { GlobalAfterChangeHook, GlobalConfig } from 'payload';
import { payloadAdminAccess } from '@/lib/payload-access';
import { revalidateSiteHeaderCache } from '@/lib/site-header';

const invalidateHeaderOnChange: GlobalAfterChangeHook = ({ doc }) => {
  try {
    revalidateSiteHeaderCache();
  } catch (error) {
    console.error('[site-header.afterChange] revalidate failed:', error);
  }
  return doc;
};

export const SiteHeader: GlobalConfig = {
  slug: 'site-header',
  label: 'Site header',
  admin: {
    description:
      'Configure the announcement banner and navigation tabs on the storefront header. Each tab can be a single link or a multi-category dropdown. Dropdown tabs open on hover.',
    group: 'Settings',
  },
  access: {
    read: () => true,
    update: payloadAdminAccess,
  },
  hooks: {
    afterChange: [invalidateHeaderOnChange],
  },
  fields: [
    {
      name: 'announcement',
      type: 'group',
      label: 'Announcement banner',
      admin: {
        description:
          'Thin bar shown below the header (e.g. "International Shipping Available"). Turn off to hide.',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Show banner',
          defaultValue: false,
        },
        {
          name: 'text',
          type: 'text',
          label: 'Banner text',
          admin: {
            condition: (_data, sibling) => Boolean(sibling?.enabled),
            placeholder: 'International Shipping Available',
          },
        },
        {
          name: 'link',
          type: 'text',
          label: 'Banner link',
          admin: {
            condition: (_data, sibling) => Boolean(sibling?.enabled),
            placeholder: '/info/shipping or https://…',
            description: 'Optional. Leave empty for plain text.',
          },
        },
        {
          name: 'backgroundColor',
          type: 'text',
          label: 'Background color',
          admin: {
            condition: (_data, sibling) => Boolean(sibling?.enabled),
            placeholder: '#ffffff',
            description: 'Optional hex color. Defaults to white (light) / dark (dark mode).',
          },
        },
        {
          name: 'textColor',
          type: 'text',
          label: 'Text color',
          admin: {
            condition: (_data, sibling) => Boolean(sibling?.enabled),
            placeholder: '#171717',
            description: 'Optional hex color. Defaults to near-black (light) / white (dark mode).',
          },
        },
      ],
    },
    {
      name: 'includeDefaultTabs',
      type: 'checkbox',
      label: 'Include default tabs',
      defaultValue: true,
      admin: {
        description:
          'When enabled, Home / Shop / Categories appear automatically. Disable this to use only the tabs you add below — deleting a tab then removes it from the navbar.',
      },
    },
    {
      name: 'hiddenDefaults',
      type: 'select',
      hasMany: true,
      label: 'Hide default tabs',
      admin: {
        description:
          'Only applies when "Include default tabs" is on. Select built-in tabs to remove from the navbar.',
        isClearable: true,
        condition: (data) => data?.includeDefaultTabs !== false,
      },
      options: [
        { label: 'Home (Trang chủ)', value: 'home' },
        { label: 'Shop (Cửa hàng)', value: 'shop' },
        { label: 'Categories (Danh mục)', value: 'categories' },
      ],
    },
    {
      name: 'tabs',
      type: 'array',
      label: 'Navigation tabs',
      labels: { singular: 'Tab', plural: 'Tabs' },
      admin: {
        description:
          'Custom navigation tabs. When "Include default tabs" is off, this list is your complete menu — remove a row and save to delete it from the storefront.',
        initCollapsed: true,
        components: {
          RowLabel:
            '@/src/payload/components/HeaderTabRowLabel#HeaderTabRowLabel',
        },
      },
      fields: [
        {
          name: 'label',
          type: 'text',
          required: true,
          admin: {
            placeholder: 'e.g. Flash Sale',
            description: 'Label shown in the storefront navbar.',
          },
        },
        {
          name: 'kind',
          type: 'select',
          required: true,
          defaultValue: 'category',
          admin: {
            description: 'Tab type. "Dropdown" opens on hover.',
          },
          options: [
            { label: 'Home (/)', value: 'home' },
            { label: 'All products (/search)', value: 'all-products' },
            { label: 'Single category', value: 'category' },
            { label: 'Custom URL', value: 'custom' },
            { label: 'Category dropdown', value: 'dropdown' },
          ],
        },
        {
          name: 'category',
          type: 'relationship',
          relationTo: 'categories',
          admin: {
            condition: (_data, sibling) => sibling?.kind === 'category',
            description:
              'Links to /search/{category-slug}. Create the category under Categories, then select it here.',
          },
        },
        {
          name: 'href',
          type: 'text',
          admin: {
            condition: (_data, sibling) => sibling?.kind === 'custom',
            placeholder: '/info/sale or https://…',
            description:
              'Use "/" for internal pages or "http(s)://" for external links.',
          },
        },
        {
          name: 'showAllCategories',
          type: 'checkbox',
          defaultValue: false,
          admin: {
            condition: (_data, sibling) => sibling?.kind === 'dropdown',
            description:
              'When enabled, the dropdown lists every category automatically. Otherwise add child items below.',
          },
        },
        {
          name: 'dropdownItems',
          type: 'array',
          label: 'Dropdown items',
          admin: {
            condition: (_data, sibling) => sibling?.kind === 'dropdown',
            description: 'Skip if "List all categories" is enabled above.',
            initCollapsed: true,
            components: {
              RowLabel:
                '@/src/payload/components/HeaderDropdownItemRowLabel#HeaderDropdownItemRowLabel',
            },
          },
          fields: [
            {
              name: 'label',
              type: 'text',
              admin: {
                description: 'Leave empty to use the category name.',
              },
            },
            {
              name: 'category',
              type: 'relationship',
              relationTo: 'categories',
              required: true,
            },
          ],
        },
      ],
    },
  ],
};
