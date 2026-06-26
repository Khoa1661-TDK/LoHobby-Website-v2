// payload.config.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { en } from '@payloadcms/translations/languages/en';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { BlogCategories } from './src/payload/collections/BlogCategories';
import { Carts } from './src/payload/collections/Carts';
import { Categories } from './src/payload/collections/Categories';
import { Posts } from './src/payload/collections/Posts';
import { Pages } from './src/payload/collections/Pages';
import { Media } from './src/payload/collections/Media';
import { Orders } from './src/payload/collections/Orders';
import { PaymentMethods } from './src/payload/collections/PaymentMethods';
import { ProductVariants } from './src/payload/collections/ProductVariants';
import { Products } from './src/payload/collections/Products';
import { Redirects } from './src/payload/collections/Redirects';
import { StoreCustomers } from './src/payload/collections/StoreCustomers';
import { Users } from './src/payload/collections/Users';
import { DropshipSettings } from './src/payload/globals/DropshipSettings';
import { Navigation } from './src/payload/globals/Navigation';
import { NotificationSettings } from './src/payload/globals/NotificationSettings';
import { ShippingSettings } from './src/payload/globals/ShippingSettings';
import { SiteHeader } from './src/payload/globals/SiteHeader';
import { StoreSettings } from './src/payload/globals/StoreSettings';
import { shopnexPlugins } from './src/payload/plugins';

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

export default buildConfig({
  // `APP_URL` (runtime, non-`NEXT_PUBLIC_`) is read first so one prebuilt image
  // can serve any domain — Next.js inlines `NEXT_PUBLIC_*` at build time, which
  // would freeze the admin/serverURL to the build-time host (e.g. localhost).
  serverURL:
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000',
  secret: payloadSecret,
  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: ' — Admin',
    },
    importMap: {
      baseDir: path.resolve(dirname, 'src/payload'),
    },
  },
  i18n: {
    fallbackLanguage: 'en',
    supportedLanguages: { en },
  },
  // Content localization (distinct from admin-UI i18n above). Mirrors the
  // storefront locales in i18n/routing.ts so CMS pages can hold vi + en content.
  localization: {
    locales: [
      { label: 'Tiếng Việt', code: 'vi' },
      { label: 'English', code: 'en' },
    ],
    defaultLocale: 'vi',
    fallback: true,
  },
  routes: {
    admin: '/admin',
    api: '/admin/api',
  },
  editor: lexicalEditor(),
  collections: [
    Users,
    Media,
    Categories,
    Products,
    ProductVariants,
    PaymentMethods,
    Carts,
    Orders,
    BlogCategories,
    Posts,
    StoreCustomers,
    Pages,
    Redirects,
  ],
  globals: [SiteHeader, Navigation, StoreSettings, ShippingSettings, DropshipSettings, NotificationSettings],
  db: postgresAdapter({
    pool: {
      connectionString: databaseUrl,
      // Prevent CMS list views from leaving read transactions open and blocking mark-paid.
      idle_in_transaction_session_timeout: 30_000,
    },
    schemaName: 'payload',
    push: process.env.PAYLOAD_DB_PUSH === 'true',
  }),
  sharp,
  typescript: {
    outputFile: path.resolve(dirname, 'src/payload/payload-types.ts'),
  },
  plugins: shopnexPlugins,
});
