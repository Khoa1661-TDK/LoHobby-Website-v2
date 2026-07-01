// scripts/seed-store-settings.ts — ensure the store-settings global exists (idempotent)
import { config as loadEnv } from 'dotenv';
import {
  BRAND_CONTACT,
  BRAND_DESCRIPTION,
  BRAND_DESCRIPTION_SHORT,
  BRAND_TAGLINE,
  getSiteName,
} from '@/lib/brand';

loadEnv();

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  try {
    await payload.findGlobal({ slug: 'store-settings', depth: 0 });
    console.log('[store-settings] global already exists.');
    return;
  } catch {
    // Document missing or schema was out of date — create defaults below.
  }

  await payload.updateGlobal({
    slug: 'store-settings',
    data: {
      storeName: getSiteName(),
      storeDescription: BRAND_DESCRIPTION,
      storeDescriptionShort: BRAND_DESCRIPTION_SHORT,
      footerTagline: BRAND_TAGLINE,
      contactEmail: BRAND_CONTACT.email,
      contactPhone: BRAND_CONTACT.phone,
      contactAddress: BRAND_CONTACT.address,
      currencyCode: 'VND',
      primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY ?? '#1f6feb',
      secondaryColor:
        process.env.NEXT_PUBLIC_BRAND_SECONDARY ??
        process.env.NEXT_PUBLIC_BRAND_ACCENT ??
        '#0b3ea8',
      fontPreset: 'jakarta',
      heroEnabled: true,
      heroShowCarousel: true,
      heroCarouselTitle: 'New arrivals',
      footerShowNewsletter: true,
      taxEnabled: false,
      taxRatePercent: 10,
    },
    depth: 0,
  });

  console.log('[store-settings] created default global.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[store-settings] seed failed: ${message}`);
  process.exit(1);
});
