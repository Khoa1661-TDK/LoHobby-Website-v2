// scripts/verify-prisma.ts
import 'dotenv/config';
import { prisma } from '@/lib/prisma';

async function main(): Promise<void> {
  const count = await prisma.product.count();
  console.log(`✅ Connected (${count} product row(s) readable).`);
}

main()
  .catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
