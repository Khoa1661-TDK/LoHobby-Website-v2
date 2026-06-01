// payload.config.ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { en } from '@payloadcms/translations/languages/en';
import { buildConfig } from 'payload';
import sharp from 'sharp';
import { Carts } from './src/payload/collections/Carts';
import { Categories } from './src/payload/collections/Categories';
import { ContentPages } from './src/payload/collections/ContentPages';
import { Media } from './src/payload/collections/Media';
import { Orders } from './src/payload/collections/Orders';
import { PaymentMethods } from './src/payload/collections/PaymentMethods';
import { ProductVariants } from './src/payload/collections/ProductVariants';
import { Products } from './src/payload/collections/Products';
import { StoreCustomers } from './src/payload/collections/StoreCustomers';
import { Users } from './src/payload/collections/Users';
import { DropshipSettings } from './src/payload/globals/DropshipSettings';
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
  serverURL:
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
    ContentPages,
    StoreCustomers,
  ],
  globals: [SiteHeader, StoreSettings, ShippingSettings, DropshipSettings],
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
