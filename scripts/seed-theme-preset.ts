// scripts/seed-theme-preset.ts — seed default theme presets into store-settings global
import { config as loadEnv } from 'dotenv';
import { themePresets } from '@/lib/theme-presets';

loadEnv();

async function main(): Promise<void> {
  const { default: config } = await import('@payload-config');
  const { getPayload } = await import('payload');

  const payload = await getPayload({ config });

  // Print available presets for admin reference.
  console.log('Available theme presets:\n');
  for (const preset of Object.values(themePresets)) {
    console.log(`  ${preset.name} (${preset.id})`);
    console.log(`    ${preset.description}`);
    console.log(`    Primary:  ${preset.primaryColor}`);
    console.log(`    Secondary: ${preset.secondaryColor}`);
    console.log(`    Font:     ${preset.fontPreset}`);
    console.log();
  }

  // Upsert store-settings global with theme preset values.
  try {
    const existing = await payload.findGlobal({ slug: 'store-settings', depth: 0 });

    const currentPreset =
      typeof (existing as Record<string, unknown>).fontPreset === 'string'
        ? (existing as Record<string, unknown>).fontPreset
        : 'jakarta';

    console.log(`[theme-presets] Current store font preset: ${currentPreset}`);
    console.log('[theme-presets] Seed complete — no changes made.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[theme-presets] Could not read store-settings: ${message}`);
    console.log('[theme-presets] Run "pnpm payload:seed-store-settings" first.');
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[theme-presets] seed failed: ${message}`);
  process.exit(1);
});