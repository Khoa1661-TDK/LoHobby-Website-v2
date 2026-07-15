// scripts/seed-home-page.ts — ensure a `home` page always exists (idempotent).
// Run: tsx scripts/seed-home-page.ts
import { config as loadEnv } from 'dotenv';
import type { Payload } from 'payload';
import { buildHomeSeedLayout } from '@/lib/page-builder/home-seed';

loadEnv();

// Bootstrapping behavior: the seed is authoritative for the `home` page. If a
// `home` page already exists (e.g. an older draft), it is UPDATED to a published
// page with the freshly designed layout — otherwise re-running could never heal a
// stale draft, and the storefront would keep falling back to the hardcoded home.
// Once you start editing the home page in the builder, stop running this seed.
// `locales` is the set of content locales to write the layout into. The `layout`
// field is localized, so writing only the default locale leaves other locales
// (e.g. `en`) holding whatever stale layout they had — and because Payload's
// locale fallback only kicks in for *empty* fields, a stale non-empty layout is
// served as-is. Writing every locale keeps the redesign consistent across the
// storefront's language routes. Defaults to the default content locale so unit
// tests stay focused; the CLI runner passes the full list from the Payload config.
export async function ensureHomePage(
  payload: Pick<Payload, 'find' | 'create' | 'update'>,
  locales: string[] = ['vi'],
): Promise<'created' | 'updated'> {
  const existing = await payload.find({
    collection: 'pages',
    where: { slug: { equals: 'home' } },
    limit: 1,
    pagination: false,
  });

  const products = await payload.find({
    collection: 'products',
    limit: 8,
    sort: '-createdAt',
    pagination: false,
  });
  // Keep IDs in the products collection's native type (numeric here) — stringifying
  // them makes the `products` relationship field fail validation.
  const featuredProductIds = products.docs.map((d) => d.id);

  // Resolve category ids so the FeaturedCollection blocks bind to real categories
  // (otherwise they render the "configure this block" placeholder).
  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
    pagination: false,
  });
  const categoryIdBySlug: Record<string, string | number> = {};
  for (const cat of categories.docs) {
    if (typeof cat.slug === 'string') categoryIdBySlug[cat.slug] = cat.id;
  }

  const data = {
    title: 'Home',
    slug: 'home',
    status: 'published',
    layout: buildHomeSeedLayout({ featuredProductIds, categoryIdBySlug }) as never,
  };

  // Write the default locale first (create if missing), then mirror the layout into
  // every other locale via per-locale updates. Fresh block IDs are generated per
  // locale by Payload, so each locale gets an independent copy of the redesign.
  const [primaryLocale, ...otherLocales] = locales.length ? locales : ['vi'];

  const current = existing.docs[0];
  const id = current
    ? ((await payload.update({ collection: 'pages', id: current.id, data, locale: primaryLocale })), current.id)
    : (await payload.create({ collection: 'pages', data, locale: primaryLocale })).id;

  for (const locale of otherLocales) {
    await payload.update({ collection: 'pages', id, data, locale });
  }

  return current ? 'updated' : 'created';
}

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  // Locales come from i18n/routing.ts — the single source of truth that the Payload
  // localization config mirrors. Reading it directly avoids depending on the shape of
  // the sanitized Payload config (whose `localization.locales` is not a plain array at
  // runtime), which previously caused the seed to silently write only the default locale.
  const { routing } = await import('@/i18n/routing');
  const locales = [...routing.locales];

  const result = await ensureHomePage(payload, locales);
  console.log(
    result === 'created'
      ? `[home-page] created (published) for locales: ${locales.join(', ')}.`
      : `[home-page] updated existing to published with fresh layout for locales: ${locales.join(', ')}.`,
  );
}

// CLI runner — only executes when invoked directly (e.g. `tsx scripts/seed-home-page.ts`),
// so importing this module from a test does not trigger a live Payload bootstrap.
if (process.argv[1] && process.argv[1].includes('seed-home-page')) {
  // Exit explicitly on success. Payload holds an open Postgres pool, so the event
  // loop never drains on its own and the process would hang here forever —
  // blocking docker/entrypoint.sh, which runs these seeds sequentially before
  // starting the server. Only the failure path used to exit, so a seed that
  // WORKED hung the boot while a seed that FAILED let it continue.
  main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[home-page] seed failed: ${message}`);
      process.exit(1);
    });
}
