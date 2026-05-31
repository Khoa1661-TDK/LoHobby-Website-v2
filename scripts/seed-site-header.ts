// scripts/seed-site-header.ts — ensure the site-header global exists (idempotent)
import { config as loadEnv } from 'dotenv';

loadEnv();

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  try {
    await payload.findGlobal({ slug: 'site-header', depth: 0 });
    console.log('[site-header] global already exists.');
    return;
  } catch {
    // Document missing or unreadable — create defaults below.
  }

  await payload.updateGlobal({
    slug: 'site-header',
    data: {
      includeDefaultTabs: true,
      hiddenDefaults: [],
      tabs: [],
    },
    depth: 0,
  });

  console.log('[site-header] created default global.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[site-header] seed failed: ${message}`);
  process.exit(1);
});
