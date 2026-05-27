// scripts/verify-prisma.ts
import 'dotenv/config';
import { prisma } from '@/lib/prisma';

async function main(): Promise<void> {
  const [users, orders] = await Promise.all([prisma.user.count(), prisma.order.count()]);
  console.log(`✅ Connected (${users} user(s), ${orders} order(s) readable).`);
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
