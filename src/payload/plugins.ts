// src/payload/plugins.ts — ShopNex admin UX plugins
import type { Config, Plugin } from 'payload';
import { analyticsPlugin } from '@shopnex/analytics-plugin';
import { importExportPlugin } from '@shopnex/import-export-plugin';
import { quickActionsPlugin } from '@shopnex/quick-actions-plugin';
import { sidebarPlugin } from '@shopnex/sidebar-plugin';
import { seoPlugin } from '@payloadcms/plugin-seo';
import type { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types';
import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage';
import { postgresStorageAdapter } from './storage/postgres-adapter';

const storeName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Lô Hobby';
// `APP_URL` (runtime, non-`NEXT_PUBLIC_`) first so SEO canonical/OG URLs follow
// the deployment domain without a rebuild (NEXT_PUBLIC_* are baked at build).
const appBaseUrl =
  process.env.APP_URL ??
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

/**
 * Registers the nightly auto-sale job task and its autoRun drain.
 *
 * Deliberately a plugin appended after `importExportPlugin` in the array
 * below, rather than a static `jobs` property on the base config passed to
 * `buildConfig`. `@shopnex/import-export-plugin` only registers its own
 * `createCollectionExport` job task when `config.jobs` is still falsy at the
 * point it runs (`config.jobs = config.jobs || { tasks: [...] }` in its
 * index.ts) — if `jobs` were already set on the base config, that check would
 * short-circuit and the plugin's task would silently vanish from the schema
 * (verified: `payload migrate:create` then generates an enum recreation that
 * drops `createCollectionExport`). Running after it and merging onto
 * `config.jobs.tasks` keeps both task registrations regardless of plugin
 * order changes upstream, as long as this stays last.
 */
const autoSaleJobsPlugin = (): Plugin => (config: Config) => {
  const existingTasks = config.jobs?.tasks ?? [];

  config.jobs = {
    ...config.jobs,
    tasks: [
      ...existingTasks,
      {
        slug: 'autoSale',
        label: 'Automatic sale (most-viewed products)',
        // Queues itself nightly at 03:10. `autoRun` below is what drains it.
        schedule: [{ cron: '10 3 * * *', queue: 'nightly' }],
        retries: 0,
        inputSchema: [],
        outputSchema: [],
        handler: async ({ req }) => {
          // Dynamic import: a top-level import of lib/auto-sale/run here
          // would pull lib/auto-sale/select.ts into the config module graph
          // alongside Products.ts and risk the known import-cycle TDZ crash.
          const { runAutoSale } = await import('@/lib/auto-sale/run');
          await runAutoSale(req.payload);
          return { output: {} };
        },
      },
    ],
    // Fires every 5 minutes: each tick first enqueues any task whose
    // `schedule` cron is due, then runs the queue. Latency after 03:10 stays
    // under 5 minutes.
    autoRun: [{ cron: '*/5 * * * *', queue: 'nightly', limit: 1 }],
    deleteJobOnComplete: true,
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
    collections: ['products', 'categories', 'pages', 'posts', 'blog-categories'],
    uploadsCollection: 'media',
    generateTitle: generateSeoTitle,
    generateURL: generateSeoURL,
    tabbedUI: true,
  }),
  analyticsPlugin({}),
  vndAnalyticsDashboardPlugin(),
  sidebarPlugin(),
  commerceNavPlugin(),
  cloudStoragePlugin({
    collections: {
      media: {
        adapter: postgresStorageAdapter(),
        disableLocalStorage: true,
      },
    },
  }),
  // Must stay last: merges onto config.jobs.tasks after importExportPlugin
  // has had a chance to register its own task. See the comment on
  // autoSaleJobsPlugin above.
  autoSaleJobsPlugin(),
];
