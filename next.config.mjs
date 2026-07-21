// next.config.mjs
import { withPayload } from '@payloadcms/next/withPayload';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Content-Security-Policy — ENFORCING. Permissive on script-src only: the
// Payload admin panel and the Next.js runtime both need inline + eval'd
// scripts, so 'unsafe-inline'/'unsafe-eval' remain for now — removing them
// requires migrating the admin panel to a nonce-based CSP, which is a
// separate follow-up. Remote product images are limited to the pinned hosts
// in images.remotePatterns (not "arbitrary https hosts"), and checkout posts
// to the PayOS payment domain.
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
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
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
      // Imported product catalog images (Shopee CDN) — the only external https
      // image host the storefront actually renders. Pinned to the exact host,
      // not a wildcard, to close the SSRF hole a wide-open `hostname: '**'`
      // pattern created (the Next.js image optimizer would otherwise
      // server-side-fetch any attacker-supplied URL, including cloud instance
      // metadata endpoints and internal service ports).
      { protocol: 'https', hostname: 'cf.shopee.vn' },
      // YouTube thumbnails derived by `youtubeThumbnail()` in lib/reel-embed.ts
      // and rendered through next/image by components/blocks/ReelCarousel.client.tsx
      // when a reel has no hand-uploaded poster. An un-allowed hostname makes
      // next/image THROW during render rather than just failing the image, so
      // omitting this 500s any page carrying a posterless reel — including the
      // seeded homepage. Pinned to the exact host for the same SSRF reason as above.
      { protocol: 'https', hostname: 'i.ytimg.com' },
      // Dev-only: Payload builds media URLs from the request host, so browsing
      // the store over http via a LAN IP (e.g. http://192.168.1.3:3000 from a
      // phone) or any non-localhost dev host yields http image sources.
      // Without this the image optimizer returns 400 and every Payload-hosted
      // image fails to load locally. Excluded from production builds — an
      // open http:'**' pattern is the primary SSRF vector (plain-http fetches
      // to e.g. 169.254.169.254 cloud metadata), and production never needs it
      // since prod Payload media is served over https from the app's own host.
      ...(process.env.NODE_ENV !== 'production'
        ? [{ protocol: 'http', hostname: '**' }]
        : []),
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
