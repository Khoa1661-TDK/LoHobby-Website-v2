// next.config.mjs
import { withPayload } from '@payloadcms/next/withPayload';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Content-Security-Policy in REPORT-ONLY mode. It does not block anything yet —
// it surfaces violations so we can tighten the policy before enforcing it.
// Permissive on purpose: the Payload admin panel and the Next.js runtime both
// need inline + eval'd scripts, the storefront loads remote product images from
// arbitrary https hosts (see images.remotePatterns), and checkout posts to the
// PayOS payment domain. Tighten (drop 'unsafe-*', pin hosts) once reports are
// clean, then switch the header name to `Content-Security-Policy`.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  // Same-origin only: the page-builder preview iframe at /build/*/preview is
  // same-origin server-rendered HTML, so 'self' is sufficient.
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "form-action 'self' https:",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Content-Security-Policy-Report-Only', value: contentSecurityPolicy },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Do not advertise the framework.
  poweredByHeader: false,
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
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
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
