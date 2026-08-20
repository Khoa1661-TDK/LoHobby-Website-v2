// Vitest setup: mock Next.js server-only so server-side modules can be tested in Node.
import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({}));

// `lib/prisma-client` builds the PrismaClient at module scope and throws when
// DATABASE_URL is unset, so importing any Prisma-backed module would fail here.
// The adapters under lib/console/ are tested through their pure mappers only —
// the async readers that actually touch this client are never called in a test.
vi.mock('@/lib/prisma-client', () => {
  const prisma = {};
  return { prisma, default: prisma };
});
