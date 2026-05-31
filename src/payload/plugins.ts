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
  const title = typeof doc?.title === 'string' ? doc.title : '';
  return title ? `${title} | ${storeName}` : storeName;
};

const generateSeoURL: GenerateURL = ({ doc, collectionConfig }) => {
  const slug = typeof doc?.slug === 'string' ? doc.slug : '';
  if (!slug) return appBaseUrl;
  if (collectionConfig?.slug === 'categories') {
    return `${appBaseUrl}/search/${slug}`;
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

export const shopnexPlugins: Plugin[] = [
  importExportPlugin({
    collections: ['products', 'orders'],
    disableJobsQueue: true,
    importCollections: [{ collectionSlug: 'products' }, { collectionSlug: 'orders' }],
  }),
  quickActionsPlugin({ position: 'before-nav-links' }),
  seoPlugin({
    collections: ['products', 'categories', 'content-pages'],
    uploadsCollection: 'media',
    generateTitle: generateSeoTitle,
    generateURL: generateSeoURL,
    tabbedUI: true,
  }),
  analyticsPlugin({}),
  vndAnalyticsDashboardPlugin(),
  sidebarPlugin(),
];
