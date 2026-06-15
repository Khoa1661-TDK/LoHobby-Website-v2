// next.config.mjs
import { withPayload } from '@payloadcms/next/withPayload';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Prisma + native DB deps external (pnpm + Next 15). Do not externalize
  // @payloadcms/* — webpack must bundle those so CSS imports (e.g. react-image-crop) resolve.
  serverExternalPackages: [
    '@prisma/client',
    '@prisma/adapter-pg',
    '@prisma/driver-adapter-utils',
    'pg',
  ],
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async redirects() {
    return [
      { source: '/admin/cms', destination: '/admin', permanent: false },
      { source: '/admin/cms/:path*', destination: '/admin/:path*', permanent: false },
      { source: '/admin/order', destination: '/admin/collections/orders', permanent: false },
      { source: '/admin/orders', destination: '/admin/collections/orders', permanent: false },
      { source: '/p/:slug', destination: '/pages/:slug', permanent: true },
      { source: '/:locale/p/:slug', destination: '/:locale/pages/:slug', permanent: true },
    ];
  },
};

// `devBundleServerPackages: false` skips the heavy webpack pass over Payload's
// server-only deps in dev — major CPU savings for `pnpm dev`. The flag is
// safely ignored in production builds (where bundling is always required).
export default withPayload(withNextIntl(nextConfig), { devBundleServerPackages: false });
