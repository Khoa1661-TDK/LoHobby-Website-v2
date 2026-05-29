// payload.config.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { seoPlugin } from '@payloadcms/plugin-seo';
import type { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { en } from '@payloadcms/translations/languages/en';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { Categories } from './src/payload/collections/Categories';
import { Media } from './src/payload/collections/Media';
import { PaymentMethods } from './src/payload/collections/PaymentMethods';
import { Products } from './src/payload/collections/Products';
import { Users } from './src/payload/collections/Users';
import { SiteHeader } from './src/payload/globals/SiteHeader';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Payload to start');
}

const payloadSecret = process.env.PAYLOAD_SECRET ?? process.env.AUTH_SECRET;
if (!payloadSecret) {
  throw new Error('PAYLOAD_SECRET (or AUTH_SECRET fallback) must be set');
}

const storeName = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Our Store';

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

export default buildConfig({
  serverURL: appBaseUrl,
  secret: payloadSecret,
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' — Admin',
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en },
  },
  routes: {
    admin: '/admin',
    api: '/admin/api',
  },
  editor: lexicalEditor(),
  collections: [Users, Media, Categories, Products, PaymentMethods],
  globals: [SiteHeader],
  db: postgresAdapter({
    pool: { connectionString: databaseUrl },
    schemaName: 'payload',
    // Only push when explicitly requested — auto-push blocks the dev server on prompts.
    push: process.env.PAYLOAD_DB_PUSH === 'true',
  }),
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload/payload-types.ts'),
  },
  plugins: [
    seoPlugin({
      collections: ['products', 'categories'],
      uploadsCollection: 'media',
      generateTitle: generateSeoTitle,
      generateURL: generateSeoURL,
      tabbedUI: true,
    }),
  ],
});
