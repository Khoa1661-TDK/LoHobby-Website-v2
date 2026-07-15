// scripts/seed-payload-admin.ts
import { config as loadEnv } from 'dotenv';

loadEnv();

async function main(): Promise<void> {
  const { seedPayloadAdminUsers } = await import('@/lib/payload-admin-sync');
  await seedPayloadAdminUsers();
  console.log('[payload] CMS admin accounts are ready.');
}

// Exit explicitly on success. Payload holds an open Postgres pool, so the event
// loop never drains on its own and the process would hang here forever —
// blocking docker/entrypoint.sh, which runs these seeds sequentially before
// starting the server. Only the failure path used to exit, so a seed that
// WORKED hung the boot while a seed that FAILED let it continue.
main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[payload] failed to seed CMS admins: ${message}`);
    process.exit(1);
  });
