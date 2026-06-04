// Vitest setup: mock Next.js server-only so server-side modules can be tested in Node.
import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@payload-config', () => ({ default: {} }));
vi.mock('payload', () => ({ getPayload: vi.fn() }));
vi.mock('next/cache', () => ({
  unstable_cache: (_fn: unknown) => _fn,
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));