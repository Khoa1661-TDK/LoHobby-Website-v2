// scripts/seed-brand-colors.ts — set the store's brand colors to the redesign-3
// blue palette on an EXISTING store-settings global (idempotent).
//
// seed-store-settings.ts only writes defaults when the global is missing, so a
// store that was seeded while the theme was monochrome keeps its black primary.
// Run this once to flip the accent to blue: `pnpm tsx scripts/seed-brand-colors.ts`.
import { config as loadEnv } from 'dotenv';

loadEnv();

const PRIMARY = process.env.NEXT_PUBLIC_BRAND_PRIMARY ?? '#1f6feb';
const SECONDARY =
  process.env.NEXT_PUBLIC_BRAND_SECONDARY ?? process.env.NEXT_PUBLIC_BRAND_ACCENT ?? '#0b3ea8';

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  await payload.updateGlobal({
    slug: 'store-settings',
    data: { primaryColor: PRIMARY, secondaryColor: SECONDARY },
    depth: 0,
  });

  console.log(`[brand-colors] set primary=${PRIMARY} secondary=${SECONDARY}.`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[brand-colors] seed failed: ${message}`);
  process.exit(1);
});
