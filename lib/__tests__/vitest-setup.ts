// Vitest setup: mock Next.js server-only so server-side modules can be tested in Node.
import { vi } from 'vitest';

vi.mock('server-only', () => ({}));
