// scripts/seed-payload-admin.ts
import { config as loadEnv } from 'dotenv';

loadEnv();

async function main(): Promise<void> {
  const { seedPayloadAdminUsers } = await import('@/lib/payload-admin-sync');
  await seedPayloadAdminUsers();
  console.log('[payload] CMS admin accounts are ready.');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[payload] failed to seed CMS admins: ${message}`);
  process.exit(1);
});
