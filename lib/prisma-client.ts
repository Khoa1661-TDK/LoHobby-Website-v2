// lib/prisma-client.ts
// The Prisma singleton itself, WITHOUT the 'server-only' guard.
//
// Application code must NOT import this — import `lib/prisma` instead, which
// re-exports this module behind 'server-only' so an accidental import from a
// Client Component fails at build time.
//
// This split exists because 'server-only' resolves to a module that throws
// unconditionally; only Next's `react-server` export condition swaps it for a
// no-op. Anything running under plain node/tsx — `payload migrate`,
// `payload generate:importmap`, and every script in scripts/ — therefore
// explodes the moment it loads a module that imports 'server-only', and
// deferring that to a lazy `await import()` only moves the throw to call time.
// The Payload media storage adapter reaches Prisma from exactly those contexts,
// so it needs a door into the client that is not behind the guard.
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
