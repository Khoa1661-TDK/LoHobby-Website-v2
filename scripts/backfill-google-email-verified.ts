// scripts/backfill-google-email-verified.ts — one-time: mark emailVerified for every
// existing user who has a linked Google Account row. Google already confirmed the
// address at OAuth sign-in, so these users would otherwise be blocked at checkout
// until their next fresh login (auto-verify only fires in the signIn callback, and
// JWT sessions are long-lived). Idempotent: users that already have emailVerified
// set are left untouched.
//
// Run with: node_modules/.bin/tsx --conditions=react-server scripts/backfill-google-email-verified.ts
// The --conditions=react-server flag is required because lib/prisma.ts imports
// 'server-only', which throws under plain tsx otherwise (a pre-existing condition
// of this repo, unrelated to this script — confirmed scripts/verify-prisma.ts has
// the same issue).
import 'dotenv/config';
import { prisma } from '@/lib/prisma';

async function main(): Promise<void> {
  const candidates = await prisma.user.findMany({
    where: {
      emailVerified: null,
      accounts: { some: { provider: 'google' } },
    },
    select: { id: true, email: true },
  });

  if (candidates.length === 0) {
    console.log('No unverified Google-linked users found — nothing to backfill.');
    return;
  }

  const result = await prisma.user.updateMany({
    where: { id: { in: candidates.map((u) => u.id) } },
    data: { emailVerified: new Date() },
  });

  console.log(`Backfilled emailVerified for ${result.count} user(s):`);
  for (const u of candidates) {
    console.log(`  - ${u.email}`);
  }
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
