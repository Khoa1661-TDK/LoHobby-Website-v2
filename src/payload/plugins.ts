// src/payload/plugins.ts — ShopNex admin UX plugins
import type { Config, Plugin } from 'payload';
import { analyticsPlugin } from '@shopnex/analytics-plugin';
import { importExportPlugin } from '@shopnex/import-export-plugin';
import { quickActionsPlugin } from '@shopnex/quick-actions-plugin';
import { sidebarPlugin } from '@shopnex/sidebar-plugin';
import { seoPlugin } from '@payloadcms/plugin-seo';
import type { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types';

const storeName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Lô Hobby';
const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  'http://localhost:3000';

const generateSeoTitle: GenerateTitle = ({ doc }) => {
  const title =
    typeof doc?.title === 'string'
      ? doc.title
      : typeof doc?.name === 'string'
        ? doc.name
        : '';
  return title ? `${title} | ${storeName}` : storeName;
};

const generateSeoURL: GenerateURL = ({ doc, collectionConfig }) => {
  const slug = typeof doc?.slug === 'string' ? doc.slug : '';
  if (!slug) return appBaseUrl;
  if (collectionConfig?.slug === 'categories') {
    return `${appBaseUrl}/search/${slug}`;
  }
  if (collectionConfig?.slug === 'pages') {
    return `${appBaseUrl}/p/${slug}`;
  }
  if (collectionConfig?.slug === 'content-pages') {
    return `${appBaseUrl}/pages/${slug}`;
  }
  if (collectionConfig?.slug === 'posts') {
    return `${appBaseUrl}/blog/${slug}`;
  }
  if (collectionConfig?.slug === 'blog-categories') {
    return `${appBaseUrl}/blog/category/${slug}`;
  }
  return `${appBaseUrl}/product/${slug}`;
};

/** Replace ShopNex USD dashboard with VND-native analytics for this store. */
const vndAnalyticsDashboardPlugin = (): Plugin => (config: Config) => {
  config.admin = {
    ...config.admin,
    components: {
      ...config.admin?.components,
      views: {
        ...config.admin?.components?.views,
        dashboard: {
          ...config.admin?.components?.views?.dashboard,
          Component: '@/src/payload/components/AnalyticsDashboard#AnalyticsDashboard',
        },
      },
    },
  };
  return config;
};

/** Custom admin routes for Prisma-backed coupons and gift cards. */
const commerceNavPlugin = (): Plugin => (config: Config) => {
  const existing = config.admin?.components?.afterNavLinks;
  const existingLinks = Array.isArray(existing) ? existing : existing ? [existing] : [];

  config.admin = {
    ...config.admin,
    components: {
      ...config.admin?.components,
      afterNavLinks: [
        ...existingLinks,
        {
          path: '@/src/payload/components/CommerceNavLinks#CommerceNavLinks',
        },
      ],
    },
  };
  return config;
};

export const shopnexPlugins: Plugin[] = [
  importExportPlugin({
    collections: ['products', 'orders'],
    disableJobsQueue: true,
    importCollections: [{ collectionSlug: 'products' }, { collectionSlug: 'orders' }],
  }),
  quickActionsPlugin({
    position: 'before-nav-links',
    additionalActions: [
      {
        id: 'admin-orders-fulfillment',
        name: 'Quản lý đơn hàng',
        keywords: 'orders đơn hàng fulfillment vận chuyển',
        link: '/admin/collections/orders',
        priority: 71,
        group: 'commerce',
      },
      {
        id: 'admin-coupons',
        name: 'Mã giảm giá',
        keywords: 'coupon coupons mã giảm giá commerce',
        link: '/admin/coupons',
        priority: 70,
        group: 'commerce',
      },
      {
        id: 'admin-gift-cards',
        name: 'Thẻ quà tặng',
        keywords: 'gift card thẻ quà commerce',
        link: '/admin/gift-cards',
        priority: 69,
        group: 'commerce',
      },
    ],
  }),
  seoPlugin({
    collections: ['products', 'categories', 'content-pages', 'pages', 'posts', 'blog-categories'],
    uploadsCollection: 'media',
    generateTitle: generateSeoTitle,
    generateURL: generateSeoURL,
    tabbedUI: true,
  }),
  analyticsPlugin({}),
  vndAnalyticsDashboardPlugin(),
  sidebarPlugin(),
  commerceNavPlugin(),
];
