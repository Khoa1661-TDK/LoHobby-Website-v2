// prisma/seed.ts
import 'dotenv/config';

async function main(): Promise<void> {
  console.log('Run `pnpm payload:seed-catalog` to populate Payload categories and products.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
