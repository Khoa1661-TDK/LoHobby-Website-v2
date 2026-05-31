// scripts/seed-commerce-coupons.ts — sample coupons for Phase 1 checkout
import 'dotenv/config';
import { prisma } from '../lib/prisma';

async function main(): Promise<void> {
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    create: {
      code: 'WELCOME10',
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderAmount: 100_000,
      maxUses: 500,
      enabled: true,
    },
    update: {
      enabled: true,
      discountType: 'PERCENT',
      discountValue: 10,
      minOrderAmount: 100_000,
    },
  });

  console.log('Seeded coupon WELCOME10 (10% off, min 100.000₫).');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
